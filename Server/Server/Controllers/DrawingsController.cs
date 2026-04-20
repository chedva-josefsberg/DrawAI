using Microsoft.AspNetCore.Mvc;
using Server.Models;
using System.Linq;

namespace Server.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class DrawingsController : ControllerBase
    {

        private readonly DrawingContext _db;

        public DrawingsController(DrawingContext db)
        {
            _db = db;
        }
 
        // שליפת כל הציורים
        [HttpGet]
        public IActionResult GetAll()
        {
            return Ok(_db.Drawings.ToList());
        }

        // שליפת ציורים לפי משתמש ספציפי
        [HttpGet("user/{userId}")]
        public IActionResult GetByUser(int userId)
        {
            return Ok(_db.Drawings.Where(d => d.UserId == userId).ToList());
        }

        // שמירת ציור חדש
        [HttpPost]
        public IActionResult SaveDrawing([FromBody] Drawing drawing)
        {
            _db.Drawings.Add(drawing);
            _db.SaveChanges();
            return Ok(drawing);
        }

        // עדכון ציור קיים
        [HttpPut("{id}")]
        public IActionResult UpdateDrawing(int id, [FromBody] Drawing drawing)
        {
            var existing = _db.Drawings.FirstOrDefault(d => d.Id == id);
            if (existing == null)
                return NotFound();

            existing.Title = drawing.Title;
            existing.ShapesJson = drawing.ShapesJson;

            if (drawing.UserId.HasValue)
                existing.UserId = drawing.UserId;

            _db.SaveChanges();
            return Ok(existing);
        }

        // מחיקת ציור
        [HttpDelete("{id}")]
        public IActionResult DeleteDrawing(int id)
        {
            var drawing = _db.Drawings.FirstOrDefault(d => d.Id == id);
            if (drawing == null)
                return NotFound();

            _db.Drawings.Remove(drawing);
            _db.SaveChanges();
            return Ok();
        }
    }
}