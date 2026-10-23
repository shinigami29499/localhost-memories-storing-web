---
title: "Azure PostgreSQL Restore Deleted Server"
description: "Recover a deleted Azure Database for PostgreSQL Flexible Server within the 5-day window using createMode ReviveDropped, and prevent accidental deletion with resource locks"
tags: [azure, postgresql, restore, deleted-server, revive-dropped, resource-lock, disaster-recovery]
---

## Key Facts (what models get wrong)

> **Response focus:** Lead with the 5-day window and the `ReviveDropped` REST call (api-version `2025-08-01`). Recovery is best-effort, the revived server is a NEW resource, and there is no `az postgres flexible-server` command for it. Do not explain generic backup theory.

> **Shell execution:** Activity-log lookups and `show` commands are read-only — run them directly. Two commands change state and need confirmation first. For the revive `PUT` (creates a billable server), show subscription, target resource group, new server name, region, and source `resourceId`. For `az lock create`, show subscription, resource group, target resource, and lock type. Then ask "Proceed?"

> **NEVER suggest for Azure:** `pg_basebackup`, `pg_hba.conf`, `postgresql.conf`, `systemctl`, `sudo`, `/var/lib/postgresql`, or restoring "from the data directory". There is no OS or file access, and the deleted server's backups are Microsoft-managed.

| Fact | Detail |
|------|--------|
| Recovery window | Backups of a deleted server are retained for **5 days** after deletion. After that, restore fails because the backup can't be found |
| Best-effort | Restore of a deleted server often succeeds but is **not guaranteed** — never promise it |
| Same subscription only | The backup can only be accessed and restored from the subscription that hosted the deleted server |
| Same region | `location` must be the region where the deleted server existed |
| REST only | Use `Servers - Create Or Update` with `createMode: "ReviveDropped"`. No `az postgres flexible-server` subcommand exists; use `az rest` or the REST API "Try It" page |
| API version matters | Use `api-version=2025-08-01`; older versions can cause failures or timeouts |
| Restore point | `pointInTimeUTC` = the `submissionTimestamp` of the **Delete PostgreSQL Server** activity-log event |
| Source identity | `sourceServerResourceId` = the `resourceId` of that delete event |
| New server name | Can differ from the deleted name. **Prefer a different name** — reusing the same name can fail with DNS errors |
| Target resource group | Must already exist (recreate it first if the whole resource group was deleted) |
| VNet-integrated servers | Body must also include `network.delegatedSubnetResourceId` and `network.privateDnsZoneArmResourceId` pointing to existing resources |
| Success signal | HTTP **201** or **202** = request accepted; provisioning continues asynchronously |
| Prevention | A `CanNotDelete` management lock blocks control-plane deletion. Locks do NOT block `DROP DATABASE` or other SQL |

## Decision Matrix

| Situation | Path |
|-----------|------|
| Server deleted ≤ 5 days ago | `ReviveDropped` restore (this reference) |
| Server deleted > 5 days ago, Azure Backup vault long-term retention (LTR) configured | Restore the vault recovery point **as files** to a storage account, then `pg_restore` into a new server |
| Server deleted > 5 days ago, no LTR | No self-service recovery path; say so plainly |
| Server still exists but a database/table was dropped | Point-in-time restore to a new server (Azure HA/DR guidance), not `ReviveDropped` |
| Azure HorizonDB cluster deleted | Not recoverable today — see the HorizonDB section |

## Azure Step-by-Step

**1. Find the delete event (read-only).** Activity log keeps the `resourceId` and `submissionTimestamp` you need:

```bash
az monitor activity-log list --subscription <subscription-id> --offset 6d \
    --namespace Microsoft.DBforPostgreSQL \
    --query "[?ends_with(operationName.value, '/delete') && status.value=='Succeeded'].{op:operationName.value, resourceId:resourceId, submissionTimestamp:submissionTimestamp}" \
    -o table
```

Use only `Succeeded` events. Started, Failed, or Canceled delete attempts carry the wrong timestamp; if no delete succeeded, check whether the server still exists before going further. Pick the `.../flexibleServers/delete` event for the right server (ignore `.../databases/delete`). Portal equivalent: **Monitor → Activity log →** Operation = *Delete PostgreSQL server*, Status = *Succeeded* → event → **JSON** tab.

**2. Write the request body** (`revive.json`):

```json
{
  "location": "<original-region>",
  "properties": {
    "createMode": "ReviveDropped",
    "pointInTimeUTC": "<submissionTimestamp-from-delete-event>",
    "sourceServerResourceId": "<resourceId-from-delete-event>"
  }
}
```

For a deleted **VNet-integrated** server, add inside `properties`:

```json
"network": {
  "delegatedSubnetResourceId": "/subscriptions/<subscription-id>/resourceGroups/<rg>/providers/Microsoft.Network/virtualNetworks/<vnet>/subnets/<subnet>",
  "privateDnsZoneArmResourceId": "/subscriptions/<subscription-id>/resourceGroups/<rg>/providers/Microsoft.Network/privateDnsZones/<zone>"
}
```

**3. Submit the revive (confirm first — creates a new billable server):**

```bash
az rest --method put --subscription <subscription-id> \
    --url "https://management.azure.com/subscriptions/{subscription-id}/resourceGroups/{target-rg}/providers/Microsoft.DBforPostgreSQL/flexibleServers/{new-server-name}?api-version=2025-08-01" \
    --body @revive.json
```

Put the deleted server's subscription ID in the URL explicitly. Don't use the `{subscriptionId}` token, which `az rest` fills from the current `az account set` context and can silently target the wrong subscription.

**4. Monitor provisioning (read-only).** Duration depends on database size and the original compute. Track the activity-log operation *Update PostgreSQL Server Create*, or poll:

```bash
az postgres flexible-server show --subscription <subscription-id> \
    --resource-group <target-rg> --name <new-server-name> \
    --query "{state:state, fqdn:fullyQualifiedDomainName, version:version}" -o json
```

**5. Post-restore checklist.** Treat the revived server as new — verify each item rather than assuming it carried over:
- Update connection strings, DNS CNAMEs, Key Vault secrets, and app config to the new FQDN
- Firewall rules / private endpoints / VNet, server parameters, `azure.extensions` allowlist, Entra ID admins
- HA, read replicas, diagnostic settings, alerts, and Azure Backup vault protection
- Apply a delete lock immediately (below)

## Critical Gotchas

1. **The clock is running**: The 5-day limit counts from the delete. Start the activity-log lookup immediately; don't spend days on root cause first.
2. **Wrong `pointInTimeUTC` source**: Use the delete event's `submissionTimestamp`, not "now" or a guessed time.
3. **Different subscription fails**: You can't revive into another subscription. Move resources afterward if needed.
4. **Same-name collisions**: Reusing the original name can fail on DNS; pick a new name and repoint clients.
5. **Deleted network dependencies**: If the VNet, subnet, or private DNS zone was deleted too (e.g. the resource group was deleted), recreate them before submitting.
6. **Conflicting docs**: An older backup FAQ says a deleted server's backups "can't be recovered". The dedicated restore-deleted-server guide documents the 5-day `ReviveDropped` path — follow it, but frame it as best-effort.
7. **LTR restores as files only**: Azure Backup vault recovery points restore to a storage account as dump files (target account needs cross-tenant replication allowed), then you load them with `pg_restore`.

## Prevent Accidental Deletion

State-changing — confirm subscription, resource group, server, and lock type first:

```bash
az lock create --name PreventDelete --lock-type CanNotDelete \
    --subscription <subscription-id> --resource-group <rg> \
    --resource-type Microsoft.DBforPostgreSQL/flexibleServers \
    --resource-name <server-name>
```

- Lock at server, resource group, or subscription scope; the most restrictive inherited lock wins.
- Creating/removing locks needs `Microsoft.Authorization/locks/*` (for example Owner or User Access Administrator).
- `ReadOnly` locks also block updates (scaling, parameters) — prefer `CanNotDelete` for production servers.

## Anti-Hallucination Rules

- Do NOT claim deleted servers are recoverable after 5 days, or that recovery is guaranteed
- Do NOT invent an `az postgres flexible-server restore-deleted`/`undelete`/`revive` command
- Do NOT present regular PITR (`az postgres flexible-server restore`) as the deleted-server path — the documented path is `ReviveDropped`
- Do NOT claim a deleted server can be revived into a different subscription or region
- Do NOT claim the revive is in-place or that settings and connection strings carry over automatically
- Do NOT claim resource locks prevent `DROP DATABASE` or other data-plane changes
- Do NOT apply Flexible Server `ReviveDropped` to Azure HorizonDB, or claim a deleted HorizonDB cluster can be restored

## On Azure HorizonDB (Preview)

- **Deleted HorizonDB clusters can't be restored today.** Microsoft Learn states it in both the business-continuity and security guidance.
- **No deleted-cluster restore path:** `Microsoft.HorizonDb/clusters` `createMode` only allows `Create`, `PointInTimeRestore`, and `Update` (no `ReviveDropped`). `az horizondb restore --source-cluster` and `PointInTimeRestore` both need an **existing** source cluster.
- **Never** send a Flexible Server `ReviveDropped` request to `Microsoft.HorizonDb`, or run `az horizondb restore` against a deleted cluster.
- **Don't promise recovery.** The HorizonDB backup-billing page mentions backups retained after a database is deleted, but there's no documented restore procedure. If the data is critical, open an Azure support request right away.
- **Prevention is the control:** add a **Delete** resource lock to the cluster (portal: cluster → **Locks** → **Add**, type *Delete*). Confirm before creating it.
- **Bad data in a cluster that still exists:** use HorizonDB point-in-time restore (creates a new cluster; fixed 7-day retention).

See [HorizonDB business continuity](https://learn.microsoft.com/azure/horizondb/backup-restore/concepts-business-continuity), [HorizonDB security](https://learn.microsoft.com/azure/horizondb/security/security-overview#backup-and-recovery), [`az horizondb restore`](https://learn.microsoft.com/cli/azure/horizondb?view=azure-cli-latest#az-horizondb-restore), and [HorizonDB resource locks](https://learn.microsoft.com/azure/horizondb/configure-maintain/how-to-enable-deletion-protection).

## References
- [Restore a deleted server](https://learn.microsoft.com/azure/postgresql/backup-restore/how-to-restore-deleted-server)
- [Servers - Create Or Update (2025-08-01)](https://learn.microsoft.com/rest/api/postgresql/servers/create-or-update?view=rest-postgresql-2025-08-01)
- [Protect a server with resource locks](https://learn.microsoft.com/azure/postgresql/configure-maintain/how-to-enable-deletion-protection)
- [Backup and restore concepts](https://learn.microsoft.com/azure/postgresql/backup-restore/concepts-backup-restore)
- [Restore Azure Backup recovery points as files](https://learn.microsoft.com/azure/backup/restore-azure-database-postgresql-flex)
