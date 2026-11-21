using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Infrastructures.Data.Migrations
{
    /// <inheritdoc />
    public partial class AlbumMediaOwnership : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "collection_id",
                table: "upload_batches",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "storage_deletion_pending",
                table: "media_files",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.CreateIndex(
                name: "ix_upload_batches_collection_id",
                table: "upload_batches",
                column: "collection_id");

            migrationBuilder.AddForeignKey(
                name: "fk_upload_batches_collections_collection_id",
                table: "upload_batches",
                column: "collection_id",
                principalTable: "collections",
                principalColumn: "id");

            migrationBuilder.Sql("""
                WITH loose_media AS (
                    SELECT media.id, media.owner_id, media.created_at
                    FROM media_files media
                    WHERE media.deleted_at IS NULL AND NOT media.is_preview_only
                      AND NOT EXISTS (
                          SELECT 1
                          FROM collection_media link
                          JOIN collections album ON album.id = link.collection_id
                          WHERE link.media_file_id = media.id AND link.deleted_at IS NULL
                            AND album.owner_id = media.owner_id AND album.deleted_at IS NULL
                      )
                ), pending_batches AS (
                    SELECT batch.id, batch.owner_id
                    FROM upload_batches batch
                    WHERE batch.deleted_at IS NULL AND batch.collection_id IS NULL
                      AND EXISTS (
                          SELECT 1 FROM upload_items item
                          WHERE item.upload_batch_id = batch.id AND item.deleted_at IS NULL
                            AND item.status IN ('Pending', 'Uploading', 'Paused')
                      )
                ), owners AS (
                    SELECT owner_id FROM loose_media
                    UNION
                    SELECT owner_id FROM pending_batches
                ), imported_albums AS (
                    INSERT INTO collections (name, owner_id, is_public, created_at, created_by)
                    SELECT 'Imported media', owner_id, false, now(), owner_id
                    FROM owners
                    RETURNING id, owner_id
                ), imported_links AS (
                    INSERT INTO collection_media (collection_id, media_file_id, created_at, created_by)
                    SELECT album.id, media.id, media.created_at, media.owner_id
                    FROM loose_media media JOIN imported_albums album USING (owner_id)
                )
                UPDATE upload_batches batch
                SET collection_id = album.id
                FROM pending_batches pending JOIN imported_albums album USING (owner_id)
                WHERE batch.id = pending.id;
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Preserve imported albums and links because users may have added media to them.
            migrationBuilder.DropForeignKey(
                name: "fk_upload_batches_collections_collection_id",
                table: "upload_batches");

            migrationBuilder.DropIndex(
                name: "ix_upload_batches_collection_id",
                table: "upload_batches");

            migrationBuilder.DropColumn(
                name: "collection_id",
                table: "upload_batches");

            migrationBuilder.DropColumn(
                name: "storage_deletion_pending",
                table: "media_files");
        }
    }
}
