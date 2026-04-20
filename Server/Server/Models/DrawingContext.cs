using Microsoft.EntityFrameworkCore;

namespace Server.Models
{
    public class DrawingContext : DbContext
    {
        public DrawingContext(DbContextOptions<DrawingContext> options) : base(options) { }

        public DbSet<Drawing> Drawings { get; set; }
        public DbSet<User> Users { get; set; } // הטבלה החדשה

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            // הגדרת הקשר: ציור אחד שייך למשתמש אחד
            modelBuilder.Entity<Drawing>()
                .HasOne(d => d.User)
                .WithMany(u => u.Drawings)
                .HasForeignKey(d => d.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        }
    }
}