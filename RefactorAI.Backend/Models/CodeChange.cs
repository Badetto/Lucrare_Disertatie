public class CodeChange
{
    public int LineNumber { get; set; } // The line in the NEW code
    public string Description { get; set; } = string.Empty; // What happened
    public string Principle { get; set; } = string.Empty; // e.g. "SRP", "DRY"
}