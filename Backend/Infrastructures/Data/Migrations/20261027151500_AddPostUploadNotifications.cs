using Infrastructures.Data;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Infrastructures.Data.Migrations
{
    [DbContext(typeof(ApplicationDbContext))]
    [Migration("20261027151500_AddPostUploadNotifications")]
    public partial class AddPostUploadNotifications : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "post_upload_notifications",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    actor_id = table.Column<Guid>(type: "uuid", nullable: false),
                    actor_username = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    post_caption = table.Column<string>(type: "character varying(4000)", maxLength: 4000, nullable: false),
                    post_id = table.Column<Guid>(type: "uuid", nullable: false),
                    read_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    recipient_id = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_post_upload_notifications", x => x.id);
                });

            migrationBuilder.CreateIndex(
                name: "ix_post_upload_notifications_recipient_id_created_at",
                table: "post_upload_notifications",
                columns: new[] { "recipient_id", "created_at" });

            migrationBuilder.CreateIndex(
                name: "ix_post_upload_notifications_recipient_id_read_at",
                table: "post_upload_notifications",
                columns: new[] { "recipient_id", "read_at" });
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "post_upload_notifications");
        }
    }
}
