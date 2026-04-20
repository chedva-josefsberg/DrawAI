using Microsoft.AspNetCore.Mvc;
using Server.Models;
using System.Linq;

namespace Server.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class AuthController : ControllerBase
    {
        private readonly DrawingContext _db;

        public AuthController(DrawingContext db)
        {
            _db = db;
        }

        public class AuthRequest
        {
            public string Username { get; set; }
            public string Password { get; set; }
        }

        [HttpPost("login")]
        public IActionResult Login([FromBody] AuthRequest request)
        {
            var user = _db.Users.FirstOrDefault(u => u.Username == request.Username && u.Password == request.Password);
            if (user == null) return Unauthorized("שם משתמש או סיסמה שגויים");
            return Ok(new { id = user.Id, username = user.Username });
        }

        [HttpPost("register")]
        public IActionResult Register([FromBody] AuthRequest request)
        {
            if (_db.Users.Any(u => u.Username == request.Username)) return BadRequest("השם תפוס");
            var newUser = new User { Username = request.Username, Password = request.Password };
            _db.Users.Add(newUser);
            _db.SaveChanges();
            return Ok(new { id = newUser.Id, username = newUser.Username });
        }
    }
}