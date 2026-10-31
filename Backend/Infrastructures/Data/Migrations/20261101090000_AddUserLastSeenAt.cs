using Microsoft.EntityFrameworkCore.Migrations;
using Infrastructures.Data;
using Microsoft.EntityFrameworkCore.Infrastructure;

#nullable disable

namespace Infrastructures.Data.Migrations;

[DbContext(typeof(ApplicationDbContext))]
[Migration("20261101090000_AddUserLastSeenAt")]
public partial class AddUserLastSeenAt : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddColumn<DateTime>(
            name: "last_seen_at",
            table: "users",
            type: "timestamp with time zone",
            nullable: true);

        migrationBuilder.CreateIndex(
            name: "ix_users_last_seen_at",
            table: "users",
            column: "last_seen_at");
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropIndex(name: "ix_users_last_seen_at", table: "users");
        migrationBuilder.DropColumn(name: "last_seen_at", table: "users");
    }
}
