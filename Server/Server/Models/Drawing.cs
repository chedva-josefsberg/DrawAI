using System.Text.Json.Serialization;

namespace Server.Models
{
    public class Drawing
    {
        public int Id { get; set; }
        public string? Title { get; set; }
        public string? ShapesJson { get; set; }
        public int? UserId { get; set; }

        [JsonIgnore]
        public User? User { get; set; }
    }
}