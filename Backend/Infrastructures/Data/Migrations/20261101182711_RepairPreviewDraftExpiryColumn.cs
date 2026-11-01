using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Infrastructures.Data.Migrations
{
    /// <inheritdoc />
    public partial class RepairPreviewDraftExpiryColumn : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                ALTER TABLE media_files
                ADD COLUMN IF NOT EXISTS preview_draft_expires_at timestamp with time zone;
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // The original preview migration owns this column; keep it on repair rollback.
        }
    }
}
