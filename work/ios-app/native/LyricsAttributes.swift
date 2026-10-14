import ActivityKit
import Foundation

@available(iOS 16.2, *)
struct LyricsAttributes: ActivityAttributes {
    struct ContentState: Codable, Hashable {
        var phrase: String
        var backs: String
        var nextPhrase: String
        var lineID: String
        var highlighted: Int
        var highlightEnabled: Bool
        var playing: Bool
        var transition: String
        var title: String?
    }
    var title: String
    var trackID: String
}
