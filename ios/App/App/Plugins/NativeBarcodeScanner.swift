// file: ios/App/App/Plugins/NativeBarcodeScanner.swift v1 - Native AVFoundation barcode scanner for iOS

import Foundation
import Capacitor
import AVFoundation
import UIKit

@objc(NativeBarcodeScanner)
public class NativeBarcodeScanner: CAPPlugin, AVCaptureMetadataOutputObjectsDelegate {

    private var captureSession: AVCaptureSession?
    private var videoPreviewLayer: AVCaptureVideoPreviewLayer?
    private var scannerViewController: UIViewController?
    private var currentCall: CAPPluginCall?
    private var supportedFormats: [AVMetadataObject.ObjectType] = []

    public override func load() {
        super.load()

        // Define supported barcode formats for comprehensive scanning
        supportedFormats = [
            .upce,
            .code39,
            .code39Mod43,
            .ean13,
            .ean8,
            .code93,
            .code128,
            .pdf417,
            .qr,
            .aztec,
            .interleaved2of5,
            .itf14,
            .dataMatrix
        ]

        // Add UPC-A if available (iOS 15.4+)
        if #available(iOS 15.4, *) {
            supportedFormats.append(.codabar)
        }

        NSLog("🍎 NativeBarcodeScanner plugin loaded with %d supported formats", supportedFormats.count)
    }

    @objc func scanBarcode(_ call: CAPPluginCall) {
        NSLog("🍎 Native barcode scan requested")
        self.currentCall = call

        DispatchQueue.main.async {
            self.requestCameraPermissionAndStartScanning()
        }
    }

    @objc func checkPermissions(_ call: CAPPluginCall) {
        let cameraAuthStatus = AVCaptureDevice.authorizationStatus(for: .video)

        var status: String
        switch cameraAuthStatus {
        case .authorized:
            status = "granted"
        case .denied, .restricted:
            status = "denied"
        case .notDetermined:
            status = "prompt"
        @unknown default:
            status = "prompt"
        }

        call.resolve([
            "camera": status
        ])
    }

    @objc func requestPermissions(_ call: CAPPluginCall) {
        AVCaptureDevice.requestAccess(for: .video) { granted in
            DispatchQueue.main.async {
                call.resolve([
                    "camera": granted ? "granted" : "denied"
                ])
            }
        }
    }

    private func requestCameraPermissionAndStartScanning() {
        let cameraAuthStatus = AVCaptureDevice.authorizationStatus(for: .video)

        switch cameraAuthStatus {
        case .authorized:
            startNativeScanning()
        case .notDetermined:
            AVCaptureDevice.requestAccess(for: .video) { [weak self] granted in
                DispatchQueue.main.async {
                    if granted {
                        self?.startNativeScanning()
                    } else {
                        self?.currentCall?.reject("Camera permission denied", "PERMISSION_DENIED")
                        self?.currentCall = nil
                    }
                }
            }
        case .denied, .restricted:
            currentCall?.reject("Camera permission required. Please enable camera access in Settings.", "PERMISSION_DENIED")
            currentCall = nil
        @unknown default:
            currentCall?.reject("Unknown camera permission status", "PERMISSION_ERROR")
            currentCall = nil
        }
    }

    private func startNativeScanning() {
        NSLog("🍎 Starting native AVFoundation camera session")

        // Create capture session
        captureSession = AVCaptureSession()

        guard let captureSession = captureSession else {
            currentCall?.reject("Failed to create camera session", "CAMERA_ERROR")
            currentCall = nil
            return
        }

        // Get camera device
        guard let videoCaptureDevice = AVCaptureDevice.default(for: .video) else {
            currentCall?.reject("Camera not available", "CAMERA_ERROR")
            currentCall = nil
            return
        }

        // Create input
        let videoInput: AVCaptureDeviceInput
        do {
            videoInput = try AVCaptureDeviceInput(device: videoCaptureDevice)
        } catch {
            currentCall?.reject("Camera input error: \(error.localizedDescription)", "CAMERA_ERROR")
            currentCall = nil
            return
        }

        // Add input to session
        if captureSession.canAddInput(videoInput) {
            captureSession.addInput(videoInput)
        } else {
            currentCall?.reject("Cannot add camera input", "CAMERA_ERROR")
            currentCall = nil
            return
        }

        // Create metadata output
        let metadataOutput = AVCaptureMetadataOutput()

        if captureSession.canAddOutput(metadataOutput) {
            captureSession.addOutput(metadataOutput)

            // Set delegate and metadata types
            metadataOutput.setMetadataObjectsDelegate(self, queue: DispatchQueue.main)
            metadataOutput.metadataObjectTypes = supportedFormats

            NSLog("🍎 Configured metadata output with %d barcode types", supportedFormats.count)
        } else {
            currentCall?.reject("Cannot add metadata output", "CAMERA_ERROR")
            currentCall = nil
            return
        }

        // Create and present scanner view controller
        presentScannerViewController()

        // Start capture session
        DispatchQueue.global(qos: .background).async {
            captureSession.startRunning()
            NSLog("🍎 Camera session started")
        }
    }

    private func presentScannerViewController() {
        guard let captureSession = captureSession else { return }

        // Create scanner view controller
        let scannerVC = UIViewController()
        scannerVC.view.backgroundColor = UIColor.black
        scannerVC.modalPresentationStyle = .fullScreen

        // Create preview layer
        videoPreviewLayer = AVCaptureVideoPreviewLayer(session: captureSession)
        videoPreviewLayer?.videoGravity = .resizeAspectFill
        videoPreviewLayer?.frame = scannerVC.view.layer.bounds

        if let previewLayer = videoPreviewLayer {
            scannerVC.view.layer.addSublayer(previewLayer)
        }

        // Add scanner UI overlay
        addScannerOverlay(to: scannerVC)

        // Store reference
        scannerViewController = scannerVC

        // Present scanner
        DispatchQueue.main.async {
            if let rootViewController = UIApplication.shared.windows.first?.rootViewController {
                rootViewController.present(scannerVC, animated: true) {
                    NSLog("🍎 Scanner view controller presented")
                }
            }
        }
    }

    private func addScannerOverlay(to viewController: UIViewController) {
        let overlayView = UIView(frame: viewController.view.bounds)
        overlayView.backgroundColor = UIColor.clear

        // Create scanning reticle
        let reticleSize: CGFloat = 250
        let reticleFrame = CGRect(
            x: (overlayView.bounds.width - reticleSize) / 2,
            y: (overlayView.bounds.height - reticleSize) / 2,
            width: reticleSize,
            height: reticleSize
        )

        let reticleView = UIView(frame: reticleFrame)
        reticleView.layer.borderColor = UIColor.green.cgColor
        reticleView.layer.borderWidth = 2
        reticleView.layer.cornerRadius = 8
        reticleView.backgroundColor = UIColor.clear

        // Add corner indicators
        addCornerIndicators(to: reticleView)

        overlayView.addSubview(reticleView)

        // Add instruction label
        let instructionLabel = UILabel()
        instructionLabel.text = "🍎 Position barcode within frame"
        instructionLabel.textColor = UIColor.white
        instructionLabel.textAlignment = .center
        instructionLabel.font = UIFont.systemFont(ofSize: 18, weight: .medium)
        instructionLabel.numberOfLines = 0
        instructionLabel.translatesAutoresizingMaskIntoConstraints = false

        overlayView.addSubview(instructionLabel)

        // Add close button
        let closeButton = UIButton(type: .system)
        closeButton.setTitle("✕ Close", for: .normal)
        closeButton.setTitleColor(UIColor.white, for: .normal)
        closeButton.titleLabel?.font = UIFont.systemFont(ofSize: 16, weight: .medium)
        closeButton.backgroundColor = UIColor.black.withAlphaComponent(0.7)
        closeButton.layer.cornerRadius = 8
        closeButton.addTarget(self, action: #selector(closeScannerTapped), for: .touchUpInside)
        closeButton.translatesAutoresizingMaskIntoConstraints = false

        overlayView.addSubview(closeButton)

        // Add status label
        let statusLabel = UILabel()
        statusLabel.text = "🍎 Native iOS Scanner • Enhanced for US Products"
        statusLabel.textColor = UIColor.white.withAlphaComponent(0.8)
        statusLabel.textAlignment = .center
        statusLabel.font = UIFont.systemFont(ofSize: 14)
        statusLabel.translatesAutoresizingMaskIntoConstraints = false

        overlayView.addSubview(statusLabel)

        viewController.view.addSubview(overlayView)

        // Set up constraints
        NSLayoutConstraint.activate([
            // Instruction label
            instructionLabel.centerXAnchor.constraint(equalTo: overlayView.centerXAnchor),
            instructionLabel.bottomAnchor.constraint(equalTo: reticleView.topAnchor, constant: -30),
            instructionLabel.leadingAnchor.constraint(greaterThanOrEqualTo: overlayView.leadingAnchor, constant: 20),
            instructionLabel.trailingAnchor.constraint(lessThanOrEqualTo: overlayView.trailingAnchor, constant: -20),

            // Close button
            closeButton.topAnchor.constraint(equalTo: overlayView.safeAreaLayoutGuide.topAnchor, constant: 20),
            closeButton.trailingAnchor.constraint(equalTo: overlayView.trailingAnchor, constant: -20),
            closeButton.widthAnchor.constraint(equalToConstant: 80),
            closeButton.heightAnchor.constraint(equalToConstant: 40),

            // Status label
            statusLabel.centerXAnchor.constraint(equalTo: overlayView.centerXAnchor),
            statusLabel.topAnchor.constraint(equalTo: reticleView.bottomAnchor, constant: 30),
            statusLabel.leadingAnchor.constraint(greaterThanOrEqualTo: overlayView.leadingAnchor, constant: 20),
            statusLabel.trailingAnchor.constraint(lessThanOrEqualTo: overlayView.trailingAnchor, constant: -20)
        ])
    }

    private func addCornerIndicators(to reticleView: UIView) {
        let cornerLength: CGFloat = 20
        let cornerWidth: CGFloat = 3
        let corners = [
            // Top-left
            [(0, 0), (cornerLength, 0), (0, cornerLength)],
            // Top-right
            [(reticleView.bounds.width, 0), (reticleView.bounds.width - cornerLength, 0), (reticleView.bounds.width, cornerLength)],
            // Bottom-left
            [(0, reticleView.bounds.height), (cornerLength, reticleView.bounds.height), (0, reticleView.bounds.height - cornerLength)],
            // Bottom-right
            [(reticleView.bounds.width, reticleView.bounds.height), (reticleView.bounds.width - cornerLength, reticleView.bounds.height), (reticleView.bounds.width, reticleView.bounds.height - cornerLength)]
        ]

        for corner in corners {
            let path = UIBezierPath()
            path.move(to: CGPoint(x: corner[0].0, y: corner[0].1))
            path.addLine(to: CGPoint(x: corner[1].0, y: corner[1].1))
            path.move(to: CGPoint(x: corner[0].0, y: corner[0].1))
            path.addLine(to: CGPoint(x: corner[2].0, y: corner[2].1))

            let shapeLayer = CAShapeLayer()
            shapeLayer.path = path.cgPath
            shapeLayer.strokeColor = UIColor.green.cgColor
            shapeLayer.lineWidth = cornerWidth
            shapeLayer.fillColor = UIColor.clear.cgColor

            reticleView.layer.addSublayer(shapeLayer)
        }
    }

    @objc private func closeScannerTapped() {
        NSLog("🍎 Scanner close button tapped")
        dismissScanner(cancelled: true)
    }

    private func dismissScanner(cancelled: Bool = false) {
        NSLog("🍎 Dismissing scanner (cancelled: %@)", cancelled ? "true" : "false")

        // Stop capture session
        captureSession?.stopRunning()

        // Dismiss view controller
        DispatchQueue.main.async {
            self.scannerViewController?.dismiss(animated: true) {
                if cancelled && self.currentCall != nil {
                    self.currentCall?.reject("Scan cancelled by user", "USER_CANCELLED")
                    self.currentCall = nil
                }

                // Clean up
                self.scannerViewController = nil
                self.captureSession = nil
                self.videoPreviewLayer = nil
            }
        }
    }

    // MARK: - AVCaptureMetadataOutputObjectsDelegate

    public func metadataOutput(_ output: AVCaptureMetadataOutput, didOutput metadataObjects: [AVMetadataObject], from connection: AVCaptureConnection) {

        // Process on main thread
        DispatchQueue.main.async {
            self.processMetadataObjects(metadataObjects)
        }
    }

    private func processMetadataObjects(_ metadataObjects: [AVMetadataObject]) {
        guard let currentCall = currentCall else { return }

        for metadataObject in metadataObjects {
            guard let readableObject = metadataObject as? AVMetadataMachineReadableCodeObject else { continue }
            guard let stringValue = readableObject.stringValue else { continue }

            NSLog("🍎 Native scanner detected barcode: %@ (type: %@)", stringValue, readableObject.type.rawValue)

            // Provide haptic feedback
            let impactFeedback = UIImpactFeedbackGenerator(style: .medium)
            impactFeedback.impactOccurred()

            // Audio feedback (system sound)
            AudioServicesPlaySystemSound(1016) // Camera shutter sound

            // Determine barcode format
            let format = getBarcodeFormatName(readableObject.type)

            // Return successful result
            currentCall.resolve([
                "hasContent": true,
                "content": stringValue,
                "format": format,
                "type": readableObject.type.rawValue,
                "cancelled": false,
                "source": "native_ios_avfoundation"
            ])

            self.currentCall = nil

            // Dismiss scanner with slight delay for feedback
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) {
                self.dismissScanner(cancelled: false)
            }

            return // Exit after first successful scan
        }
    }

    private func getBarcodeFormatName(_ objectType: AVMetadataObject.ObjectType) -> String {
        switch objectType {
        case .upce:
            return "UPC_E"
        case .code39:
            return "CODE_39"
        case .code39Mod43:
            return "CODE_39_MOD43"
        case .ean13:
            return "EAN_13"
        case .ean8:
            return "EAN_8"
        case .code93:
            return "CODE_93"
        case .code128:
            return "CODE_128"
        case .pdf417:
            return "PDF_417"
        case .qr:
            return "QR_CODE"
        case .aztec:
            return "AZTEC"
        case .interleaved2of5:
            return "ITF"
        case .itf14:
            return "ITF_14"
        case .dataMatrix:
            return "DATA_MATRIX"
        default:
            if #available(iOS 15.4, *), objectType == .codabar {
                return "CODABAR"
            }
            return "UNKNOWN"
        }
    }
}