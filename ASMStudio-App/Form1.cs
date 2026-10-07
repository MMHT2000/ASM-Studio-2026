using System;
using System.Drawing;
using System.IO;
using System.Runtime.InteropServices;
using System.Threading.Tasks;
using System.Windows.Forms;
using Microsoft.Web.WebView2.Core;
using Microsoft.Web.WebView2.WinForms;

namespace ASMStudio_App;

public partial class Form1 : Form
{
    [DllImport("dwmapi.dll")]
    private static extern int DwmSetWindowAttribute(IntPtr hwnd, int attr, ref int attrValue, int attrSize);

    private WebView2 webView;

    public Form1()
    {
        InitializeComponent();

        Text = "ASM Studio — 8086 Assembly IDE";
        ClientSize = new Size(1400, 880);
        MinimumSize = new Size(1024, 700);
        StartPosition = FormStartPosition.CenterScreen;
        BackColor = Color.FromArgb(0x18, 0x18, 0x25);

        // Load Icon
        try
        {
            string iconPath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "icon.ico");
            if (File.Exists(iconPath))
            {
                Icon = new Icon(iconPath);
            }
        }
        catch { }

        // Enable Dark Titlebar on Windows 10 & 11
        try
        {
            int useDarkMode = 1;
            DwmSetWindowAttribute(Handle, 20 /* DWMWA_USE_IMMERSIVE_DARK_MODE */, ref useDarkMode, sizeof(int));
        }
        catch { }

        webView = new WebView2
        {
            Dock = DockStyle.Fill
        };
        Controls.Add(webView);

        Shown += async (s, e) => await InitializeWebViewAsync();
    }

    private async Task InitializeWebViewAsync()
    {
        try
        {
            // Resolve wwwroot folder
            string wwwroot = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "wwwroot");
            if (!Directory.Exists(wwwroot) || !File.Exists(Path.Combine(wwwroot, "index.html")))
            {
                string fallback = Path.GetFullPath(Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "..", "..", "..", "..", "asm-studio", "dist"));
                if (Directory.Exists(fallback))
                {
                    wwwroot = fallback;
                }
            }

            string userDataFolder = Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), 
                "ASMStudio", 
                "WebView2Profile"
            );
            Directory.CreateDirectory(userDataFolder);

            var env = await CoreWebView2Environment.CreateAsync(null, userDataFolder);
            await webView.EnsureCoreWebView2Async(env);

            webView.CoreWebView2.Settings.IsStatusBarEnabled = false;
            webView.CoreWebView2.Settings.AreDevToolsEnabled = true;

            // Map local files to secure virtual host
            webView.CoreWebView2.SetVirtualHostNameToFolderMapping(
                "app.local", 
                wwwroot, 
                CoreWebView2HostResourceAccessKind.Allow
            );

            webView.CoreWebView2.Navigate("https://app.local/index.html");
        }
        catch (Exception ex)
        {
            MessageBox.Show(
                $"Failed to initialize ASM Studio application:\n\n{ex.Message}", 
                "ASM Studio Initialization Error", 
                MessageBoxButtons.OK, 
                MessageBoxIcon.Error
            );
        }
    }
}
