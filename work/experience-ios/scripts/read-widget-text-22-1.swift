import Foundation
import Vision
import ImageIO
let url = URL(fileURLWithPath: CommandLine.arguments[1])
guard let source = CGImageSourceCreateWithURL(url as CFURL, nil), let image = CGImageSourceCreateImageAtIndex(source, 0, nil) else { fatalError("Unreadable simulator capture") }
let request = VNRecognizeTextRequest()
request.recognitionLevel = .accurate
request.recognitionLanguages = ["fr-FR"]
request.usesLanguageCorrection = false
request.regionOfInterest = CGRect(x: 0, y: 0.92, width: 1, height: 0.08)
try VNImageRequestHandler(cgImage: image).perform([request])
let lines = (request.results ?? []).compactMap { $0.topCandidates(1).first?.string }
let data = try JSONSerialization.data(withJSONObject: lines)
print(String(data: data, encoding: .utf8)!)
