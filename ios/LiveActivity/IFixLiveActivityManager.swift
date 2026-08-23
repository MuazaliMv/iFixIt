import ActivityKit
import Foundation

@available(iOS 16.2, *)
final class IFixLiveActivityManager {
    static let shared = IFixLiveActivityManager()
    private init() {}

    func start(ticketNumber: String, serviceName: String, deadline: Date, providerCount: Int, accessToken: String) async throws {
        guard ActivityAuthorizationInfo().areActivitiesEnabled else { return }

        let attributes = IFixDispatchAttributes(ticketNumber: ticketNumber, serviceName: serviceName)
        let state = IFixDispatchAttributes.ContentState(
            providerCount: providerCount,
            deadline: deadline,
            phase: "SEARCHING",
            assignedProviderName: nil,
            isEnded: false
        )
        let content = ActivityContent(state: state, staleDate: deadline)
        let activity = try Activity.request(attributes: attributes, content: content, pushType: .token)

        Task {
            for await tokenData in activity.pushTokenUpdates {
                let token = tokenData.map { String(format: "%02x", $0) }.joined()
                try? await register(ticketNumber: ticketNumber, activityId: activity.id, pushToken: token, accessToken: accessToken)
            }
        }
    }

    func refresh(ticketNumber: String, providerCount: Int, deadline: Date, assignedProviderName: String? = nil) async {
        for activity in Activity<IFixDispatchAttributes>.activities where activity.attributes.ticketNumber == ticketNumber {
            let ended = assignedProviderName != nil || deadline <= Date()
            let state = IFixDispatchAttributes.ContentState(
                providerCount: providerCount,
                deadline: deadline,
                phase: ended ? "ENDED" : "SEARCHING",
                assignedProviderName: assignedProviderName,
                isEnded: ended
            )
            let content = ActivityContent(state: state, staleDate: ended ? nil : deadline)
            if ended {
                await activity.end(content, dismissalPolicy: .immediate)
            } else {
                await activity.update(content)
            }
        }
    }

    func end(ticketNumber: String, providerName: String? = nil) async {
        for activity in Activity<IFixDispatchAttributes>.activities where activity.attributes.ticketNumber == ticketNumber {
            let state = IFixDispatchAttributes.ContentState(
                providerCount: activity.content.state.providerCount,
                deadline: Date(),
                phase: "ENDED",
                assignedProviderName: providerName,
                isEnded: true
            )
            await activity.end(ActivityContent(state: state, staleDate: nil), dismissalPolicy: .immediate)
        }
    }

    private func register(ticketNumber: String, activityId: String, pushToken: String, accessToken: String) async throws {
        var request = URLRequest(url: URL(string: "https://yzlhlilxiszefneshatm.supabase.co/functions/v1/ios-live-activity")!)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("Bearer \(accessToken)", forHTTPHeaderField: "Authorization")
        request.httpBody = try JSONSerialization.data(withJSONObject: [
            "action": "register",
            "ticketNumber": ticketNumber,
            "activityId": activityId,
            "pushToken": pushToken,
            "environment": "production"
        ])
        let (_, response) = try await URLSession.shared.data(for: request)
        guard let http = response as? HTTPURLResponse, (200..<300).contains(http.statusCode) else {
            throw URLError(.badServerResponse)
        }
    }
}
