using Server.Models;

public class User
{
    public int Id { get; set; }
    public string Username { get; set; }
    public string Password { get; set; } // הערה: במערכת אמיתית מצפינים את זה, כאן נשמור פשוט לצורך הלמידה

    // קשר יחיד-לרבים: למשתמש אחד יש הרבה ציורים
    public ICollection<Drawing> Drawings { get; set; }
}