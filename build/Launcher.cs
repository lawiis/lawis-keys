using System;
using System.IO;
using System.IO.Compression;
using System.Diagnostics;
using System.Reflection;
using System.Windows.Forms;
using System.Drawing;
using System.Threading;

namespace LawisKeysLauncher
{
    static class Program
    {
        [STAThread]
        static void Main(string[] args)
        {
            string appData = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
            string targetDir = Path.Combine(appData, "LawisKeys");
            string exePath = Path.Combine(targetDir, "Lawis Keys.exe");
            string verFile = Path.Combine(targetDir, "version.txt");

            string buildId = "2026-10-18_lawis_v1";
            bool needsExtract = !File.Exists(exePath) || !File.Exists(verFile) || File.ReadAllText(verFile).Trim() != buildId;

            if (needsExtract)
            {
                Application.EnableVisualStyles();
                Application.SetCompatibleTextRenderingDefault(false);
                using (SplashForm splash = new SplashForm(targetDir, exePath, verFile, buildId))
                {
                    Application.Run(splash);
                }
            }
            else
            {
                Launch(exePath, args);
            }
        }

        public static void Launch(string exePath, string[] args)
        {
            try
            {
                ProcessStartInfo psi = new ProcessStartInfo(exePath);
                psi.WorkingDirectory = Path.GetDirectoryName(exePath);
                if (args != null && args.Length > 0)
                {
                    psi.Arguments = string.Join(" ", args);
                }
                Process.Start(psi);
            }
            catch (Exception ex)
            {
                MessageBox.Show("Gagal menjalankan Lawis Keys: " + ex.Message, "Lawis Keys", MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
        }
    }

    public class SplashForm : Form
    {
        private string targetDir;
        private string exePath;
        private string verFile;
        private string buildId;
        private ProgressBar pb;
        private Label lbl;

        public SplashForm(string targetDir, string exePath, string verFile, string buildId)
        {
            this.targetDir = targetDir;
            this.exePath = exePath;
            this.verFile = verFile;
            this.buildId = buildId;

            this.Text = "Lawis Keys";
            this.FormBorderStyle = FormBorderStyle.None;
            this.StartPosition = FormStartPosition.CenterScreen;
            this.Size = new Size(380, 140);
            this.BackColor = Color.FromArgb(14, 15, 18);
            this.ForeColor = Color.White;
            this.ShowInTaskbar = true;

            Label title = new Label();
            title.Text = "Lawis Keys";
            title.Font = new Font("Segoe UI", 16, FontStyle.Bold);
            title.ForeColor = Color.White;
            title.Location = new Point(24, 20);
            title.AutoSize = true;
            this.Controls.Add(title);

            lbl = new Label();
            lbl.Text = "Menyiapkan aplikasi untuk pertama kali...";
            lbl.Font = new Font("Segoe UI", 9);
            lbl.ForeColor = Color.FromArgb(180, 185, 195);
            lbl.Location = new Point(26, 56);
            lbl.AutoSize = true;
            this.Controls.Add(lbl);

            pb = new ProgressBar();
            pb.Location = new Point(26, 85);
            pb.Size = new Size(328, 16);
            pb.Style = ProgressBarStyle.Marquee;
            pb.MarqueeAnimationSpeed = 30;
            this.Controls.Add(pb);

            this.Paint += (s, e) =>
            {
                using (Pen pen = new Pen(Color.FromArgb(50, 55, 65), 1))
                {
                    e.Graphics.DrawRectangle(pen, 0, 0, this.Width - 1, this.Height - 1);
                }
            };

            this.Shown += (s, e) => StartExtract();
        }

        private void StartExtract()
        {
            Thread t = new Thread(() =>
            {
                try
                {
                    Assembly asm = Assembly.GetExecutingAssembly();
                    using (Stream s = asm.GetManifestResourceStream("payload.zip"))
                    {
                        if (s == null)
                        {
                            throw new Exception("Resource payload.zip tidak ditemukan.");
                        }

                        if (!Directory.Exists(targetDir))
                        {
                            Directory.CreateDirectory(targetDir);
                        }

                        using (ZipArchive archive = new ZipArchive(s, ZipArchiveMode.Read))
                        {
                            int total = archive.Entries.Count;
                            int count = 0;
                            foreach (ZipArchiveEntry entry in archive.Entries)
                            {
                                string destPath = Path.Combine(targetDir, entry.FullName);
                                if (string.IsNullOrEmpty(entry.Name))
                                {
                                    Directory.CreateDirectory(destPath);
                                }
                                else
                                {
                                    string dir = Path.GetDirectoryName(destPath);
                                    if (!Directory.Exists(dir))
                                    {
                                        Directory.CreateDirectory(dir);
                                    }
                                    entry.ExtractToFile(destPath, true);
                                }
                                count++;
                                if (count % 35 == 0)
                                {
                                    int pct = (int)((count * 100.0) / total);
                                    this.Invoke((MethodInvoker)delegate
                                    {
                                        lbl.Text = string.Format("Mengekstrak file... {0}%", pct);
                                    });
                                }
                            }
                        }
                    }

                    File.WriteAllText(verFile, buildId);

                    this.Invoke((MethodInvoker)delegate
                    {
                        Program.Launch(exePath, null);
                        this.Close();
                    });
                }
                catch (Exception ex)
                {
                    this.Invoke((MethodInvoker)delegate
                    {
                        MessageBox.Show("Gagal mengekstrak Lawis Keys: " + ex.Message, "Error", MessageBoxButtons.OK, MessageBoxIcon.Error);
                        this.Close();
                    });
                }
            });
            t.IsBackground = true;
            t.Start();
        }
    }
}
