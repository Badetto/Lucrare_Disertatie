using Microsoft.EntityFrameworkCore;
using RefactorAI.Backend.Models.Entities;

namespace RefactorAI.Backend.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<BenchmarkRun> BenchmarkRuns { get; set; }
    public DbSet<AiRunResult> AiRunResults { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        // Tell EF Core about the relationship
        modelBuilder.Entity<BenchmarkRun>()
            .HasMany(b => b.Results)
            .WithOne()
            .HasForeignKey(r => r.BenchmarkRunId);
    }
}