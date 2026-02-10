using RefactorAI.Backend.Services;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddCors(options => // <--- NEW
{
    options.AddPolicy("AllowReactApp",
        policy =>
        {
            policy.WithOrigins("http://localhost:5173") // The URL of your React App
                  .AllowAnyHeader()
                  .AllowAnyMethod();
        });
});

// Add services to the container.
// Learn more about configuring Swagger/OpenAPI at https://aka.ms/aspnetcore/swashbuckle
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddControllers();
builder.Services.AddHttpClient(); // Allows us to make web requests
builder.Services.AddScoped<IAiGenerationService, AiGenerationService>(); // Registers our new service
builder.Services.AddScoped<ICodeMetricsService, CodeMetricsService>();
builder.Services.AddScoped<IRepositoryService, RepositoryService>();

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}
app.UseCors("AllowReactApp"); // <--- NEW

app.UseHttpsRedirection();
app.UseAuthorization();
app.MapControllers();

app.Run();
