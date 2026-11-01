using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Infrastructures.Data.Migrations
{
    /// <inheritdoc />
    public partial class EnsurePreviewDraftExpiry : Migration
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
            // AddPreviewOnlyMedia owns this column; reverting the repair must preserve it.
        }
    }
}
