import ActivityKit
import WidgetKit
import SwiftUI

@available(iOS 16.2, *)
struct LyricsWidget: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: LyricsAttributes.self) { context in
            VStack(alignment: .leading, spacing: 8) {
                Text(context.state.title ?? context.attributes.title).font(.caption).foregroundStyle(.secondary)
                phrase(context.state, text: context.state.phrase, offset: 0)
                    .font(.title3.weight(.semibold)).lineLimit(3).minimumScaleFactor(0.7)
                if !context.state.backs.isEmpty { Text(context.state.backs).font(.caption).foregroundStyle(.secondary) }
                if !context.state.playing { Label("En pause", systemImage: "pause.fill").font(.caption) }
            }.padding(16).activityBackgroundTint(.black.opacity(0.8))
        } dynamicIsland: { context in
            DynamicIsland {
                DynamicIslandExpandedRegion(.leading) { Image(systemName: context.state.playing ? "music.note" : "pause.fill").foregroundStyle(.pink) }
                DynamicIslandExpandedRegion(.bottom) {
                    VStack(spacing: 6) {
                        phrase(context.state, text: context.state.phrase, offset: 0)
                            .font(.system(size: context.state.phrase.count > 90 ? 15 : 19, weight: .semibold))
                            .lineLimit(3).minimumScaleFactor(0.7).multilineTextAlignment(.center)
                            .id(context.state.lineID)
                            .transition(context.state.transition == "none" ? .identity : .opacity)
                            .animation(.easeInOut(duration: 0.22), value: context.state.lineID)
                        if !context.state.backs.isEmpty { Text(context.state.backs).font(.caption).foregroundStyle(.secondary).lineLimit(2) }
                    }.padding(.vertical, 6)
                }
            } compactLeading: {
                let parts = split(context.state.phrase)
                phrase(context.state, text: parts.0, offset: 0).font(.system(size: 11, weight: .medium)).lineLimit(1).minimumScaleFactor(0.7)
            } compactTrailing: {
                let parts = split(context.state.phrase)
                phrase(context.state, text: parts.1, offset: parts.0.unicodeScalars.count).font(.system(size: 11, weight: .medium)).lineLimit(1).minimumScaleFactor(0.7)
            } minimal: {
                Image(systemName: "text.quote").foregroundStyle(.pink)
            }.keylineTint(.pink)
        }
    }
    private func phrase(_ state: LyricsAttributes.ContentState, text: String, offset: Int) -> some View {
        IslandPhrase(text: text, progress: Double(max(0, state.highlighted-offset)), highlight: state.highlightEnabled)
            .animation(state.highlightEnabled ? .linear(duration: 0.15) : nil, value: state.highlighted)
    }
    private func split(_ text: String) -> (String, String) {
        let chars = Array(text.unicodeScalars), middle = chars.count / 2
        guard chars.count > 8 else { return (text, "") }
        let candidates = chars.indices.filter { CharacterSet.whitespaces.contains(chars[$0]) }
        let cut = candidates.min { abs($0-middle) < abs($1-middle) }.map { $0+1 } ?? middle
        return (String(String.UnicodeScalarView(chars.prefix(cut))), String(String.UnicodeScalarView(chars.dropFirst(cut))))
    }
}

// Interpolate the next letter's colour rather than jumping an entire word at once.
private struct IslandPhrase: View, Animatable {
    var text: String
    var progress: Double
    var highlight: Bool
    var animatableData: Double { get { progress } set { progress = newValue } }
    var body: some View {
        let scalars = Array(text.unicodeScalars)
        let value = max(0, min(Double(scalars.count), progress))
        let count = Int(value.rounded(.down)), fraction = value-Double(count)
        let sung = String(String.UnicodeScalarView(scalars.prefix(count)))
        let middle = count < scalars.count ? String(scalars[count]) : ""
        let rest = String(String.UnicodeScalarView(scalars.dropFirst(min(scalars.count,count+1))))
        if !highlight { Text(text).foregroundColor(.white) }
        else {
            Text(sung).foregroundColor(.pink)
            + Text(middle).foregroundColor(Color(red: 0.55+0.45*fraction, green: 0.55-0.25*fraction, blue: 0.55+0.10*fraction))
            + Text(rest).foregroundColor(.white.opacity(0.55))
        }
    }
}

@main
struct LyricsWidgetBundle: WidgetBundle {
    var body: some Widget { LyricsWidget() }
}
