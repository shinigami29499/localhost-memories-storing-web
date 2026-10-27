using Infrastructures.Data;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Infrastructures.Data.Migrations
{
    [DbContext(typeof(ApplicationDbContext))]
    [Migration("20261027154000_AddNotificationTypes")]
    public partial class AddNotificationTypes : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "notification_type",
                table: "post_upload_notifications",
                type: "character varying(32)",
                maxLength: 32,
                nullable: false,
                defaultValue: "PostUploaded");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "notification_type",
                table: "post_upload_notifications");
        }
    }
}
