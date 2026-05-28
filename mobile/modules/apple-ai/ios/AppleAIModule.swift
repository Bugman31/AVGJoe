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
      guard SystemLanguageModel.default.isAvailable else {
        throw FoundationModelError.notAvailable
      }
      let session = LanguageModelSession(instructions: systemPrompt)
      let response = try await session.respond(to: userPrompt)
      return response.content
    }

    AsyncFunction("chat") { (systemPrompt: String, messages: [[String: String]]) -> String in
      guard #available(iOS 26.0, *) else {
        throw FoundationModelError.notAvailable
      }
      guard SystemLanguageModel.default.isAvailable else {
        throw FoundationModelError.notAvailable
      }
      let session = LanguageModelSession(instructions: systemPrompt)

      // Replay prior turns so the session has conversation history.
      // Foundation Models builds history automatically via respond(), so we
      // feed all but the last message, then send the actual new message.
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
    }
  }
}

enum FoundationModelError: Error, LocalizedError {
  case notAvailable

  var errorDescription: String? {
    switch self {
    case .notAvailable:
      return "Apple Intelligence is not available on this device. Requires iPhone 15 Pro or later with iOS 26+."
    }
  }
}
