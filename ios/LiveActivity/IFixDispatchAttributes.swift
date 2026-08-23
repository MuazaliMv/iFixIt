import ActivityKit
import Foundation

struct IFixDispatchAttributes: ActivityAttributes {
    struct ContentState: Codable, Hashable {
        var providerCount: Int
        var deadline: Date
        var phase: String
        var assignedProviderName: String?
        var isEnded: Bool
    }

    var ticketNumber: String
    var serviceName: String
}
