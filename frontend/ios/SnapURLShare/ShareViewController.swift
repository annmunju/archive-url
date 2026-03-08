import Social
import UniformTypeIdentifiers

private let sharedAppGroup = "group.com.snapurl.app"
private let sharedPayloadKey = "pendingSharedIngestPayload"

final class ShareViewController: SLComposeServiceViewController {
  override func isContentValid() -> Bool {
    true
  }

  override func didSelectPost() {
    extractSharedURL { [weak self] sharedURL in
      guard let self else { return }

      guard let sharedURL else {
        let error = NSError(domain: "SnapURLShare", code: 0, userInfo: [
          NSLocalizedDescriptionKey: "URL을 찾을 수 없습니다.",
        ])
        self.extensionContext?.cancelRequest(withError: error)
        return
      }

      self.persistSharedPayload(url: sharedURL, note: self.normalizedNote())
      self.openHostApp()
      self.extensionContext?.completeRequest(returningItems: [], completionHandler: nil)
    }
  }

  override func configurationItems() -> [Any]! {
    []
  }

  private func extractSharedURL(completion: @escaping (String?) -> Void) {
    guard let extensionItem = extensionContext?.inputItems.first as? NSExtensionItem,
          let attachments = extensionItem.attachments, !attachments.isEmpty else {
      completion(nil)
      return
    }

    for provider in attachments {
      if provider.hasItemConformingToTypeIdentifier(UTType.url.identifier) {
        provider.loadItem(forTypeIdentifier: UTType.url.identifier, options: nil) { item, _ in
          if let url = item as? URL {
            completion(url.absoluteString)
            return
          }
          if let data = item as? Data, let url = URL(dataRepresentation: data, relativeTo: nil) {
            completion(url.absoluteString)
            return
          }
          completion(nil)
        }
        return
      }

      if provider.hasItemConformingToTypeIdentifier(UTType.plainText.identifier) {
        provider.loadItem(forTypeIdentifier: UTType.plainText.identifier, options: nil) { item, _ in
          if let text = item as? String {
            completion(self.firstURL(in: text))
            return
          }
          completion(nil)
        }
        return
      }
    }

    completion(nil)
  }

  private func firstURL(in text: String) -> String? {
    guard let detector = try? NSDataDetector(types: NSTextCheckingResult.CheckingType.link.rawValue) else {
      return nil
    }
    let range = NSRange(location: 0, length: text.utf16.count)
    return detector.firstMatch(in: text, options: [], range: range)?.url?.absoluteString
  }

  private func normalizedNote() -> String? {
    let trimmed = contentText.trimmingCharacters(in: .whitespacesAndNewlines)
    return trimmed.isEmpty ? nil : trimmed
  }

  private func persistSharedPayload(url: String, note: String?) {
    var payload: [String: String] = [
      "url": url,
      "receivedAt": ISO8601DateFormatter().string(from: Date()),
    ]
    if let note {
      payload["note"] = note
    }

    guard let data = try? JSONSerialization.data(withJSONObject: payload, options: []),
          let json = String(data: data, encoding: .utf8) else {
      return
    }

    let defaults = UserDefaults(suiteName: sharedAppGroup)
    defaults?.set(json, forKey: sharedPayloadKey)
    defaults?.synchronize()
  }

  private func openHostApp() {
    guard let url = URL(string: "snapurl://ingest-from-share") else {
      return
    }
    extensionContext?.open(url, completionHandler: nil)
  }
}
