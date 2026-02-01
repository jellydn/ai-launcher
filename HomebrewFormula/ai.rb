class Ai < Formula
  desc "Fast launcher CLI to switch between AI coding assistants using fuzzy search"
  homepage "https://github.com/jellydn/ai-launcher"
  license "MIT"

  on_macos do
    on_arm do
      url "https://github.com/jellydn/ai-launcher/releases/latest/download/ai-darwin-arm64"
    end

    on_intel do
      url "https://github.com/jellydn/ai-launcher/releases/latest/download/ai-darwin-x64"
    end
  end

  on_linux do
    on_arm do
      url "https://github.com/jellydn/ai-launcher/releases/latest/download/ai-linux-arm64"
    end

    on_intel do
      url "https://github.com/jellydn/ai-launcher/releases/latest/download/ai-linux-x64"
    end
  end

  def install
    os = OS.mac? ? "darwin" : "linux"
    arch = Hardware::CPU.arm? ? "arm64" : "x64"
    bin.install "ai-#{os}-#{arch}" => "ai"
  end

  def caveats
    <<~EOS
      ai has been installed to: #{bin}/ai

      To get started, run:
        ai --help

      For configuration, see: https://github.com/jellydn/ai-launcher
    EOS
  end

  test do
    system "#{bin}/ai", "--help"
  end
end
