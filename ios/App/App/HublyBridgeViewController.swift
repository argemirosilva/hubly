import Capacitor
import WebKit

/// Mantém a escala da gestão estável, inclusive ao focar campos com teclado.
final class HublyBridgeViewController: CAPBridgeViewController {
    override func webView(with frame: CGRect, configuration: WKWebViewConfiguration) -> WKWebView {
        // O Capacitor substitui userContentController após webViewConfiguration.
        // Aqui recebemos o controller definitivo, antes da primeira navegação.
        configuration.ignoresViewportScaleLimits = false
        // Aplicado pelo pacote nativo também à interface hospedada no servidor.
        let source = """
        (() => {
          if (!['hubly.orizontech.com.br', 'localhost'].includes(location.hostname)) return;
          const content = 'width=device-width, initial-scale=1.0, minimum-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover';
          let viewport = document.querySelector('meta[name="viewport"]');
          if (!viewport) {
            viewport = document.createElement('meta');
            viewport.name = 'viewport';
            document.head.appendChild(viewport);
          }
          viewport.content = content;
        })();
        """
        configuration.userContentController.addUserScript(WKUserScript(
            source: source, injectionTime: .atDocumentEnd, forMainFrameOnly: true
        ))
        return super.webView(with: frame, configuration: configuration)
    }
}
