class Ai < Formula
  desc "Fast launcher CLI to switch between AI coding assistants using fuzzy search"
  homepage "https://github.com/jellydn/ai-cli-switcher"
  version "0.1.0"
  license "MIT"

  on_macos do
    on_arm do
      url "https://github.com/jellydn/ai-cli-switcher/releases/latest/download/ai-darwin-arm64"
      sha256 ""

      def install
        bin.install "ai-darwin-arm64" => "ai"
      end
    end

    on_intel do
      url "https://github.com/jellydn/ai-cli-switcher/releases/latest/download/ai-darwin-x64"
      sha256 ""

      def install
        bin.install "ai-darwin-x64" => "ai"
      end
    end
  end

  on_linux do
    on_arm do
      url "https://github.com/jellydn/ai-cli-switcher/releases/latest/download/ai-linux-arm64"
      sha256 ""

      def install
        bin.install "ai-linux-arm64" => "ai"
      end
    end

    on_intel do
      url "https://github.com/jellydn/ai-cli-switcher/releases/latest/download/ai-linux-x64"
      sha256 ""

      def install
        bin.install "ai-linux-x64" => "ai"
      end
    end
  end

  test do
    assert_match "launcher", shell_output("#{bin}/ai --help 2>&1", 0)
  end
end
