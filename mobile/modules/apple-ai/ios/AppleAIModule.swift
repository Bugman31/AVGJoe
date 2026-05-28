import ExpoModulesCore
import FoundationModels

public class AppleAIModule: Module {
  public func definition() -> ModuleDefinition {
    Name("AppleAI")

    AsyncFunction("isAvailable") { () -> Bool in
      if #available(iOS 26.0, *) {
        return SystemLanguageModel.default.isAvailable
      }
      return false
    }

    AsyncFunction("availabilityReason") { () -> String in
      if #available(iOS 26.0, *) {
        return SystemLanguageModel.default.isAvailable ? "available" : "model_not_ready"
      }
      return "os_not_supported"
    }

    AsyncFunction("generateText") { (systemPrompt: String, userPrompt: String) -> String in
      guard #available(iOS 26.0, *) else {
        throw FoundationModelError.notAvailable
      }
      do {
        let session = LanguageModelSession(instructions: systemPrompt)
        let response = try await session.respond(to: userPrompt)
        return response.content
      } catch {
        // Surface the raw Foundation Models error so the JS layer can show it
        throw FoundationModelError.sessionFailed(error.localizedDescription)
      }
    }

    AsyncFunction("chat") { (systemPrompt: String, messages: [[String: String]]) -> String in
      guard #available(iOS 26.0, *) else {
        throw FoundationModelError.notAvailable
      }
      do {
        let session = LanguageModelSession(instructions: systemPrompt)

        var priorMessages = messages
        let lastMessage = priorMessages.removeLast()

        for msg in priorMessages {
          guard let role = msg["role"], let content = msg["content"] else { continue }
          if role == "user" {
            _ = try? await session.respond(to: content)
          }
        }

        let userText = lastMessage["content"] ?? ""
        let response = try await session.respond(to: userText)
        return response.content
      } catch {
        throw FoundationModelError.sessionFailed(error.localizedDescription)
      }
    }
  }
}

enum FoundationModelError: Error, LocalizedError {
  case notAvailable
  case sessionFailed(String)

  var errorDescription: String? {
    switch self {
    case .notAvailable:
      return "Apple Intelligence is not available on this device. Requires iPhone 15 Pro or later with iOS 26+."
    case .sessionFailed(let detail):
      return "FoundationModels: \(detail)"
    }
  }
}
