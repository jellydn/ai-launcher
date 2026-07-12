class AiMeeting < Formula
  desc "AI meeting assistant CLI that extracts summaries, action items, and risks from transcripts"
  homepage "https://github.com/jellydn/ai-launcher"
  license "MIT"

  on_macos do
    on_arm do
      url "https://github.com/jellydn/ai-launcher/releases/latest/download/ai-meeting-darwin-arm64"
    end

    on_intel do
      url "https://github.com/jellydn/ai-launcher/releases/latest/download/ai-meeting-darwin-x64"
    end
  end

  on_linux do
    on_arm do
      url "https://github.com/jellydn/ai-launcher/releases/latest/download/ai-meeting-linux-arm64"
    end

    on_intel do
      url "https://github.com/jellydn/ai-launcher/releases/latest/download/ai-meeting-linux-x64"
    end
  end

  def install
    os = OS.mac? ? "darwin" : "linux"
    arch = Hardware::CPU.arm? ? "arm64" : "x64"
    bin.install "ai-meeting-#{os}-#{arch}" => "ai-meeting"
  end

  def caveats
    <<~EOS
      ai-meeting has been installed to: #{bin}/ai-meeting

      To get started, run:
        ai-meeting --help

      For configuration, see: https://github.com/jellydn/ai-launcher
    EOS
  end

  test do
    system "#{bin}/ai-meeting", "--help"
  end
end
