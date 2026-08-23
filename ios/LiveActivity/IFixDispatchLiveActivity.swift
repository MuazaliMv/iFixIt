import ActivityKit
import WidgetKit
import SwiftUI

struct IFixDispatchLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: IFixDispatchAttributes.self) { context in
            VStack(alignment: .leading, spacing: 8) {
                HStack {
                    Label("iFixMV · Finding a provider", systemImage: "megaphone.fill")
                        .font(.headline)
                    Spacer()
                    Text("\(context.state.providerCount) replied")
                        .font(.caption.weight(.semibold))
                }

                if context.state.isEnded {
                    Text(context.state.assignedProviderName.map { "Provider assigned · \($0)" } ?? "Provider search finished")
                        .font(.title3.weight(.bold))
                } else {
                    Text(timerInterval: Date()...context.state.deadline, countsDown: true)
                        .font(.system(.title2, design: .rounded).weight(.bold))
                        .monospacedDigit()
                    Text("Selection unlocks when the broadcast ends")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }
            .padding()
            .activityBackgroundTint(.white)
            .activitySystemActionForegroundColor(.blue)
        } dynamicIsland: { context in
            DynamicIsland {
                DynamicIslandExpandedRegion(.leading) {
                    Image(systemName: "megaphone.fill")
                }
                DynamicIslandExpandedRegion(.trailing) {
                    Text("\(context.state.providerCount) replied")
                        .font(.caption.weight(.semibold))
                }
                DynamicIslandExpandedRegion(.center) {
                    Text("Finding a provider")
                        .font(.headline)
                }
                DynamicIslandExpandedRegion(.bottom) {
                    if context.state.isEnded {
                        Text(context.state.assignedProviderName.map { "Provider assigned · \($0)" } ?? "Provider search finished")
                    } else {
                        HStack {
                            Text("Broadcast ends in")
                            Spacer()
                            Text(timerInterval: Date()...context.state.deadline, countsDown: true)
                                .monospacedDigit()
                                .fontWeight(.bold)
                        }
                    }
                }
            } compactLeading: {
                Image(systemName: "megaphone.fill")
            } compactTrailing: {
                if context.state.isEnded {
                    Image(systemName: "checkmark.circle.fill")
                } else {
                    Text(timerInterval: Date()...context.state.deadline, countsDown: true)
                        .monospacedDigit()
                        .font(.caption2.weight(.bold))
                }
            } minimal: {
                Image(systemName: context.state.isEnded ? "checkmark.circle.fill" : "megaphone.fill")
            }
            .widgetURL(URL(string: "ifixmv://requests/\(context.attributes.ticketNumber)"))
        }
    }
}
