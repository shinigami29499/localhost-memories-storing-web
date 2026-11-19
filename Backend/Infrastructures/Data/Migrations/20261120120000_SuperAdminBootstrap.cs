using Infrastructures.Data;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

namespace Infrastructures.Data.Migrations;

[DbContext(typeof(ApplicationDbContext))]
[Migration("20261120120000_SuperAdminBootstrap")]
public sealed class SuperAdminBootstrap : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder) => migrationBuilder.Sql("CREATE TABLE super_admin_bootstrap (id integer PRIMARY KEY, completed boolean NOT NULL); INSERT INTO super_admin_bootstrap (id, completed) VALUES (1, false);");
    protected override void Down(MigrationBuilder migrationBuilder) => migrationBuilder.Sql("DROP TABLE super_admin_bootstrap;");
}
