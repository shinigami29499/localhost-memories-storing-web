using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Infrastructures.Data.Migrations
{
    /// <inheritdoc />
    public partial class LinkUploadBatchesToPosts : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "caption",
                table: "upload_batches",
                type: "character varying(4000)",
                maxLength: 4000,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<Guid>(
                name: "post_id",
                table: "upload_batches",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "ix_upload_batches_post_id",
                table: "upload_batches",
                column: "post_id",
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "fk_upload_batches_posts_post_id",
                table: "upload_batches",
                column: "post_id",
                principalTable: "posts",
                principalColumn: "id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "fk_upload_batches_posts_post_id",
                table: "upload_batches");

            migrationBuilder.DropIndex(
                name: "ix_upload_batches_post_id",
                table: "upload_batches");

            migrationBuilder.DropColumn(
                name: "caption",
                table: "upload_batches");

            migrationBuilder.DropColumn(
                name: "post_id",
                table: "upload_batches");
        }
    }
}
