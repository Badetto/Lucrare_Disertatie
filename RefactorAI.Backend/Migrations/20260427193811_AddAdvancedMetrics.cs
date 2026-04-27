using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RefactorAI.Backend.Migrations
{
    /// <inheritdoc />
    public partial class AddAdvancedMetrics : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "BenchmarkRuns",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    OriginalComplexity = table.Column<int>(type: "INTEGER", nullable: false),
                    OriginalLinesOfCode = table.Column<int>(type: "INTEGER", nullable: false),
                    OriginalMaintainabilityIndex = table.Column<double>(type: "REAL", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BenchmarkRuns", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "AiRunResults",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    BenchmarkRunId = table.Column<int>(type: "INTEGER", nullable: false),
                    ProviderName = table.Column<string>(type: "TEXT", nullable: false),
                    DurationSeconds = table.Column<double>(type: "REAL", nullable: false),
                    IsSuccess = table.Column<bool>(type: "INTEGER", nullable: false),
                    ErrorMessage = table.Column<string>(type: "TEXT", nullable: false),
                    NewComplexity = table.Column<int>(type: "INTEGER", nullable: false),
                    NewLinesOfCode = table.Column<int>(type: "INTEGER", nullable: false),
                    NewMaintainabilityIndex = table.Column<double>(type: "REAL", nullable: false),
                    Explanation = table.Column<string>(type: "TEXT", nullable: false),
                    IdentifiedCodeSmells = table.Column<string>(type: "TEXT", nullable: false),
                    AppliedTechniques = table.Column<string>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AiRunResults", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AiRunResults_BenchmarkRuns_BenchmarkRunId",
                        column: x => x.BenchmarkRunId,
                        principalTable: "BenchmarkRuns",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_AiRunResults_BenchmarkRunId",
                table: "AiRunResults",
                column: "BenchmarkRunId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "AiRunResults");

            migrationBuilder.DropTable(
                name: "BenchmarkRuns");
        }
    }
}
