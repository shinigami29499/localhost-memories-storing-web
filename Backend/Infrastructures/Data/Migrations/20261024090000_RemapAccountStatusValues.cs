using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Infrastructures.Data.Migrations
{
    /// <summary>Remaps the stored users.status integers for the renumbered
    /// AccountStatus enum: Disabled 2→0, PendingApproval 3→2 (older rows may
    /// hold 0 from the transient earlier enum layout).</summary>
    public partial class RemapAccountStatusValues : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Park old Disabled(2) first so it cannot collide with the new PendingApproval(2).
            migrationBuilder.Sql("UPDATE users SET status = -99 WHERE status = 2;");
            // PendingApproval arrived as 3 (or 0 under the transient layout); new value is 2.
            migrationBuilder.Sql("UPDATE users SET status = 2 WHERE status IN (0, 3);");
            migrationBuilder.Sql("UPDATE users SET status = 0 WHERE status = -99;");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("UPDATE users SET status = -99 WHERE status = 0;");
            migrationBuilder.Sql("UPDATE users SET status = 3 WHERE status = 2;");
            migrationBuilder.Sql("UPDATE users SET status = 2 WHERE status = -99;");
        }
    }
}
