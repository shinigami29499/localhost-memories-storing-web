using Infrastructures.Data;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Infrastructures.Data.Migrations;

[DbContext(typeof(ApplicationDbContext))]
[Migration("20261102120000_AddUploadDownloadViewedAt")]
public sealed class AddUploadDownloadViewedAt : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddColumn<DateTime>(
            name: "viewed_at",
            table: "upload_batches",
            type: "timestamp with time zone",
            nullable: true);

        migrationBuilder.AddColumn<DateTime>(
            name: "viewed_at",
            table: "download_batch_states",
            type: "timestamp with time zone",
            nullable: true);

        migrationBuilder.Sql("UPDATE upload_batches SET viewed_at = created_at WHERE viewed_at IS NULL;");
        migrationBuilder.Sql("UPDATE download_batch_states SET viewed_at = created_at WHERE viewed_at IS NULL;");
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropColumn(name: "viewed_at", table: "upload_batches");
        migrationBuilder.DropColumn(name: "viewed_at", table: "download_batch_states");
    }
}
