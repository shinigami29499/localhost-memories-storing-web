using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Infrastructures.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddPreviewOnlyMedia : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "is_preview_only",
                table: "media_files",
                type: "boolean",
                nullable: false,
                defaultValue: false);
            migrationBuilder.AddColumn<DateTime>(
                name: "preview_draft_expires_at",
                table: "media_files",
                type: "timestamp with time zone",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "preview_draft_expires_at",
                table: "media_files");
            migrationBuilder.DropColumn(
                name: "is_preview_only",
                table: "media_files");
        }
    }
}
