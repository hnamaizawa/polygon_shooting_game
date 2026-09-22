using System.Diagnostics;
using System.Drawing;
using System.Reflection;
using System.Windows.Forms;
using Microsoft.Web.WebView2.Core;
using Microsoft.Web.WebView2.WinForms;

namespace PolygonStrike.Windows;

internal static class Program
{
    [STAThread]
    private static void Main(string[] args)
    {
        if (args.Any(a => string.Equals(a, "--smoke-test", StringComparison.OrdinalIgnoreCase)))
        {
            Environment.ExitCode = SmokeTest.Run();
            return;
        }

        ApplicationConfiguration.Initialize();
        Application.Run(new GameForm());
    }
}

internal sealed class GameForm : Form
{
    private readonly WebView2 _webView = new()
    {
        Dock = DockStyle.Fill,
        DefaultBackgroundColor = Color.Black
    };

    public GameForm()
    {
        Text = $"POLYGON STRIKE v{Application.ProductVersion}";
        StartPosition = FormStartPosition.CenterScreen;
        ClientSize = new Size(1100, 760);
        MinimumSize = new Size(1000, 700);
        BackColor = Color.Black;
        Controls.Add(_webView);
    }

    protected override async void OnShown(EventArgs e)
    {
        base.OnShown(e);
        await InitializeGameAsync();
    }

    private async Task InitializeGameAsync()
    {
        try
        {
            var webRoot = EmbeddedGameAssets.Extract();
            var userData = Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
                "PolygonStrike",
                "WebView2");

            Directory.CreateDirectory(userData);
            var environment = await CoreWebView2Environment.CreateAsync(userDataFolder: userData);
            await _webView.EnsureCoreWebView2Async(environment);

            _webView.CoreWebView2.Settings.AreDevToolsEnabled = false;
            _webView.CoreWebView2.Settings.AreDefaultContextMenusEnabled = false;
            _webView.CoreWebView2.Settings.IsZoomControlEnabled = false;
            _webView.CoreWebView2.SetVirtualHostNameToFolderMapping(
                "polygonstrike.local",
                webRoot,
                CoreWebView2HostResourceAccessKind.Allow);

            _webView.CoreWebView2.NavigationStarting += (_, args) =>
            {
                if (!Uri.TryCreate(args.Uri, UriKind.Absolute, out var uri) ||
                    !string.Equals(uri.Host, "polygonstrike.local", StringComparison.OrdinalIgnoreCase))
                {
                    args.Cancel = true;
                }
            };

            _webView.Source = new Uri("https://polygonstrike.local/index.html");
            _webView.Focus();
        }
        catch (WebView2RuntimeNotFoundException)
        {
            ShowWebView2RuntimeError();
        }
        catch (Exception ex)
        {
            MessageBox.Show(
                this,
                $"ゲームの起動に失敗しました。\n\n{ex.Message}",
                "POLYGON STRIKE",
                MessageBoxButtons.OK,
                MessageBoxIcon.Error);
            Close();
        }
    }

    private void ShowWebView2RuntimeError()
    {
        var result = MessageBox.Show(
            this,
            "Microsoft Edge WebView2 Runtime が見つかりません。\n" +
            "Windows 10/11 では通常インストール済みですが、未導入の場合は Microsoft 公式ページからインストールしてください。\n\n" +
            "公式ページを開きますか？",
            "POLYGON STRIKE",
            MessageBoxButtons.YesNo,
            MessageBoxIcon.Warning);

        if (result == DialogResult.Yes)
        {
            Process.Start(new ProcessStartInfo
            {
                FileName = "https://developer.microsoft.com/microsoft-edge/webview2/",
                UseShellExecute = true
            });
        }

        Close();
    }
}

internal static class EmbeddedGameAssets
{
    private static readonly (string Resource, string RelativePath)[] Files =
    {
        ("web.index.html", "index.html"),
        ("web.style.css", "style.css"),
        ("web.src.game-core.js", Path.Combine("src", "game-core.js")),
        ("web.src.v052-enhancements.js", Path.Combine("src", "v052-enhancements.js")),
        ("web.src.release-version.js", Path.Combine("src", "release-version.js")),
        ("web.src.audio.js", Path.Combine("src", "audio.js")),
        ("web.src.game.js", Path.Combine("src", "game.js"))
    };

    public static string Extract()
    {
        var version = typeof(EmbeddedGameAssets).Assembly
            .GetName().Version?.ToString() ?? "dev";
        var root = Path.Combine(Path.GetTempPath(), "PolygonStrike", version, "web");
        Directory.CreateDirectory(root);

        var assembly = Assembly.GetExecutingAssembly();
        foreach (var (resource, relativePath) in Files)
        {
            using var stream = assembly.GetManifestResourceStream(resource)
                ?? throw new InvalidOperationException($"Embedded resource not found: {resource}");

            var output = Path.Combine(root, relativePath);
            Directory.CreateDirectory(Path.GetDirectoryName(output)!);
            using var file = File.Create(output);
            stream.CopyTo(file);
        }

        return root;
    }

    public static bool Validate()
    {
        var root = Extract();
        return Files.All(f => File.Exists(Path.Combine(root, f.RelativePath)));
    }
}

internal static class SmokeTest
{
    public static int Run()
    {
        try
        {
            if (!EmbeddedGameAssets.Validate())
                return 2;

            var runtimeVersion = CoreWebView2Environment.GetAvailableBrowserVersionString();
            return string.IsNullOrWhiteSpace(runtimeVersion) ? 3 : 0;
        }
        catch
        {
            return 1;
        }
    }
}
