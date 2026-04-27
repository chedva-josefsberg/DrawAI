using Microsoft.AspNetCore.Mvc;
using System.Collections.Generic;
using System.Threading.Tasks;
using System;
using System.Text.Json;
using System.Linq;
using System.Text.Json.Serialization;
using System.Net.Http;
using System.Text;

namespace Server.Controllers
{
    public class PromptRequest
    {
        public string Prompt { get; set; }
    }

    public class DrawingCommand
    {
        public string Type { get; set; } = "";
        public double? X { get; set; }
        public double? Y { get; set; }
        public double? Radius { get; set; }
        public double? Width { get; set; }
        public double? Height { get; set; }
        public double? X1 { get; set; }
        public double? Y1 { get; set; }
        public double? X2 { get; set; }
        public double? Y2 { get; set; }

        [JsonPropertyName("rx")]
        public double? Rx { get; set; }

        [JsonPropertyName("ry")]
        public double? Ry { get; set; }

        public string? Color { get; set; }
    }

    [Route("api/[controller]")]
    [ApiController]
    public class AIController : ControllerBase
    {
        private readonly IConfiguration _configuration;
        private static readonly HttpClient _httpClient = new HttpClient();

        public AIController(IConfiguration configuration)
        {
            _configuration = configuration;
        }

        [HttpPost("generate")]
        public async Task<IActionResult> GenerateShapes([FromBody] PromptRequest request)
        {
            try
            {
                if (request == null || string.IsNullOrEmpty(request.Prompt))
                    return BadRequest("השדה prompt חסר");

                var apiKey = _configuration["Anthropic:ApiKey"];
                var modelName = _configuration["Anthropic:ModelName"];

                if (string.IsNullOrEmpty(apiKey))
                    return StatusCode(500, "API Key is missing in appsettings.json for Anthropic");

                string systemPrompt = @"You are a Master 2D Illustrator Engine. You build beautiful, detailed, and perfectly proportioned scenes.

### 1. DUAL MODE:
- CONVERSATION: If the user says hello, complains, or gives feedback, reply in Hebrew. NO JSON.
- DRAWING: If asked to draw ANYTHING, return ONLY a JSON array of shapes. NO EXPLANATIONS. NO TEXT BEFORE OR AFTER THE ARRAY.

### 2. THE GRID & PHYSICS:
- Canvas: 800x600.
- Ground: y=550. All standing objects MUST rest exactly here.
- Sky/Aerial: y=50 to 200.
- Avoid overlapping: Place new objects at empty X coordinates (e.g., 100, 250, 400, 550, 700).

### 3. THE UNIVERSAL DRAWING ALGORITHM:
When drawing, you MUST execute these steps:
STEP A (RICH DETAILS): Break the object into 3-6 essential geometric parts. Add details (windows for houses, multiple leaves for trees).
STEP B (MATH & CONNECTION - NO FLOATING): You MUST calculate coordinates perfectly so parts connect. NO GAPS. NO FLOATING PARTS. 
Example Person: If Body Rect starts at Y=400, then the Head Circle (radius=20) MUST be at exactly Y=380. (380 + 20 = 400). DO THE MATH FOR EVERY OBJECT!
STEP C (SCALE):
  - House/Building: ~200px wide, ~200px tall.
  - Tree: ~80px wide, ~200px tall.
  - Person: ~40px wide, ~100px tall.
STEP D (GRAVITY): If the object stands on the ground, its lowest shape's Y-coordinate MUST end exactly at y=550.
STEP E (AESTHETIC COLORS): Do NOT use basic colors. Use rich CSS colors: 'skyblue', 'forestgreen', 'chocolate' (wood), 'gold' (sun), 'crimson', 'peachpuff' (skin), 'darkslategray'.

### 4. GEOMETRY SCHEMA:
- circle: {""type"": ""circle"", ""x"": num, ""y"": num, ""radius"": num, ""color"": ""str""}
- rect: {""type"": ""rect"", ""x"": num, ""y"": num, ""width"": num, ""height"": num, ""color"": ""str""}
- line: {""type"": ""line"", ""x1"": num, ""y1"": num, ""x2"": num, ""y2"": num, ""color"": ""str""}
- ellipse: {""type"": ""ellipse"", ""x"": num, ""y"": num, ""rx"": num, ""ry"": num, ""color"": ""str""}";

                var requestBody = new
                {
                    model = modelName,
                    max_tokens = 2000,
                    system = systemPrompt,
                    messages = new[]
                    {
                        new { role = "user", content = request.Prompt }
                    }
                };

                string jsonPayload = JsonSerializer.Serialize(requestBody);
                var content = new StringContent(jsonPayload, Encoding.UTF8, "application/json");

                
                var httpRequest = new HttpRequestMessage(HttpMethod.Post, "https://api.anthropic.com/v1/messages");
                httpRequest.Headers.Add("x-api-key", apiKey);
                httpRequest.Headers.Add("anthropic-version", "2023-06-01");
                httpRequest.Content = content;

                var response = await _httpClient.SendAsync(httpRequest);
               
                string responseContent = await response.Content.ReadAsStringAsync();

                if (!response.IsSuccessStatusCode)
                {
                    return StatusCode((int)response.StatusCode, $"Anthropic Error : {responseContent}");
                }

                using JsonDocument doc = JsonDocument.Parse(responseContent);
                string responseText = doc.RootElement.GetProperty("content")[0].GetProperty("text").GetString().Trim();

                
                var cleaned = responseText
                    .Replace("```json", "")
                    .Replace("```", "")
                    .Trim();

                var jsonOptions = new JsonSerializerOptions
                {
                    PropertyNameCaseInsensitive = true
                };

                string jsonToParse = null;
                int startArr = cleaned.IndexOf('[');
                int endArr = cleaned.LastIndexOf(']');

                if (startArr != -1 && endArr != -1 && endArr > startArr)
                {
                    jsonToParse = cleaned.Substring(startArr, endArr - startArr + 1);
                }
                else if (cleaned.Contains("{") && cleaned.Contains("}"))
                {
                    int startObj = cleaned.IndexOf('{');
                    int endObj = cleaned.LastIndexOf('}');
                    if (endObj > startObj)
                    {
                        jsonToParse = "[" + cleaned.Substring(startObj, endObj - startObj + 1) + "]";
                    }
                }

                if (jsonToParse != null || cleaned.Contains("\"type\""))
                {
                    try
                    {
                        string finalJson = jsonToParse ?? cleaned;
                        var commands = JsonSerializer.Deserialize<List<DrawingCommand>>(finalJson, jsonOptions);

                        if (commands != null && commands.Count > 0)
                        {
                            return Ok(new { type = "drawing", commands = commands });
                        }
                        else
                        {
                            return Ok(new { type = "text", message = "אופס, ה-AI התבלבל ולא הצליח לייצר את הצורות שביקשת. נסי לתאר שוב!" });
                        }
                    }
                    catch
                    {
                        return Ok(new { type = "text", message = "הקוד של הציור יצא משובש. נסי לבקש שוב!" });
                    }
                }

                return Ok(new { type = "text", message = cleaned });

            }
            catch (Exception ex)
            {
                return StatusCode(500, $"שגיאה כללית בשרת: {ex.Message}");
            }
        }
    }
}