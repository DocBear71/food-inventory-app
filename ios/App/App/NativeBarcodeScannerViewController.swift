// file: ios/App/App/NativeBarcodeScannerViewController.swift - Pure native iOS scanner for App Store approval

import UIKit
import AVFoundation
import AudioToolbox

protocol NativeBarcodeScannerDelegate: AnyObject {
    func barcodeScannerDidScanBarcode(_ barcode: String, format: String)
    func barcodeScannerDidCancel()
    func barcodeScannerDidFail(with error: String)
}

class NativeBarcodeScannerViewController: UIViewController {

    // MARK: - Properties
    weak var delegate: NativeBarcodeScannerDelegate?

    private var captureSession: AVCaptureSession!
    private var videoPreviewLayer: AVCaptureVideoPreviewLayer!
    private var supportedBarcodeTypes: [AVMetadataObject.ObjectType] = [
        .upce, .code39, .code39Mod43, .ean13, .ean8, .code93, .code128,
        .pdf417, .qr, .aztec, .interleaved2of5, .itf14, .dataMatrix
    ]

    // UI Elements
    private var scanningView: UIView!
    private var reticleView: UIView!
    private var instructionLabel: UILabel!
    private var statusLabel: UILabel!
    private var closeButton: UIButton!
    private var flashButton: UIButton!

    private var isScanning = false
    private var flashOn = false

    // MARK: - Lifecycle
    override func viewDidLoad() {
        super.viewDidLoad()
        setupUI()
        setupCamera()

        // Hide navigation bar for full-screen experience
        navigationController?.setNavigationBarHidden(true, animated: false)
    }

    override func viewWillAppear(_ animated: Bool) {
        super.viewWillAppear(animated)
        startScanning()

        // Lock orientation to portrait for consistent experience
        if let appDelegate = UIApplication.shared.delegate as? UIApplicationDelegate,
           let window = appDelegate.window as? UIWindow {
            let orientation = UIInterfaceOrientation.portrait
            window.rootViewController?.setValue(orientation.rawValue, forKey: "preferredInterfaceOrientationForPresentation")
        }
    }

    override func viewWillDisappear(_ animated: Bool) {
        super.viewWillDisappear(animated)
        stopScanning()
    }

    override var prefersStatusBarHidden: Bool {
        return true
    }

    override var supportedInterfaceOrientations: UIInterfaceOrientationMask {
        return .portrait
    }

    // MARK: - UI Setup
    private func setupUI() {
        view.backgroundColor = .black

        // Main scanning view
        scanningView = UIView()
        scanningView.backgroundColor = .black
        scanningView.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(scanningView)

        // Reticle (scanning frame)
        reticleView = UIView()
        reticleView.backgroundColor = .clear
        reticleView.layer.borderColor = UIColor.systemBlue.cgColor
        reticleView.layer.borderWidth = 3
        reticleView.layer.cornerRadius = 16
        reticleView.translatesAutoresizingMaskIntoConstraints = false

        // Add corner indicators for better visual feedback
        addCornerIndicators(to: reticleView)
        view.addSubview(reticleView)

        // Instruction label
        instructionLabel = UILabel()
        instructionLabel.text = "Position the barcode within the frame"
        instructionLabel.textColor = .white
        instructionLabel.font = UIFont.systemFont(ofSize: 18, weight: .medium)
        instructionLabel.textAlignment = .center
        instructionLabel.numberOfLines = 0
        instructionLabel.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(instructionLabel)

        // Status label
        statusLabel = UILabel()
        statusLabel.text = "Native iOS Barcode Scanner"
        statusLabel.textColor = UIColor.white.withAlphaComponent(0.8)
        statusLabel.font = UIFont.systemFont(ofSize: 16, weight: .semibold)
        statusLabel.textAlignment = .center
        statusLabel.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(statusLabel)

        // Close button
        closeButton = UIButton(type: .system)
        closeButton.setTitle("✕", for: .normal)
        closeButton.setTitleColor(.white, for: .normal)
        closeButton.titleLabel?.font = UIFont.systemFont(ofSize: 24, weight: .bold)
        closeButton.backgroundColor = UIColor.black.withAlphaComponent(0.7)
        closeButton.layer.cornerRadius = 25
        closeButton.layer.masksToBounds = true
        closeButton.addTarget(self, action: #selector(closeButtonTapped), for: .touchUpInside)
        closeButton.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(closeButton)

        // Flash button
        flashButton = UIButton(type: .system)
        flashButton.setTitle("🔦", for: .normal)
        flashButton.titleLabel?.font = UIFont.systemFont(ofSize: 24)
        flashButton.backgroundColor = UIColor.black.withAlphaComponent(0.7)
        flashButton.layer.cornerRadius = 25
        flashButton.layer.masksToBounds = true
        flashButton.addTarget(self, action: #selector(flashButtonTapped), for: .touchUpInside)
        flashButton.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(flashButton)

        // Layout constraints
        NSLayoutConstraint.activate([
            // Scanning view fills screen
            scanningView.topAnchor.constraint(equalTo: view.topAnchor),
            scanningView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            scanningView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            scanningView.bottomAnchor.constraint(equalTo: view.bottomAnchor),

            // Reticle in center
            reticleView.centerXAnchor.constraint(equalTo: view.centerXAnchor),
            reticleView.centerYAnchor.constraint(equalTo: view.centerYAnchor, constant: -50),
            reticleView.widthAnchor.constraint(equalToConstant: 280),
            reticleView.heightAnchor.constraint(equalToConstant: 280),

            // Instruction label above reticle
            instructionLabel.centerXAnchor.constraint(equalTo: view.centerXAnchor),
            instructionLabel.bottomAnchor.constraint(equalTo: reticleView.topAnchor, constant: -40),
            instructionLabel.leadingAnchor.constraint(greaterThanOrEqualTo: view.leadingAnchor, constant: 20),
            instructionLabel.trailingAnchor.constraint(lessThanOrEqualTo: view.trailingAnchor, constant: -20),

            // Status label below reticle
            statusLabel.centerXAnchor.constraint(equalTo: view.centerXAnchor),
            statusLabel.topAnchor.constraint(equalTo: reticleView.bottomAnchor, constant: 40),

            // Close button in top-right
            closeButton.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor, constant: 20),
            closeButton.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -20),
            closeButton.widthAnchor.constraint(equalToConstant: 50),
            closeButton.heightAnchor.constraint(equalToConstant: 50),

            // Flash button in top-left
            flashButton.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor, constant: 20),
            flashButton.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 20),
            flashButton.widthAnchor.constraint(equalToConstant: 50),
            flashButton.heightAnchor.constraint(equalToConstant: 50)
        ])
    }

    private func addCornerIndicators(to view: UIView) {
        let cornerLength: CGFloat = 30
        let cornerWidth: CGFloat = 4
        let cornerColor = UIColor.systemBlue.cgColor

        // Top-left corner
        let topLeft = CAShapeLayer()
        let topLeftPath = UIBezierPath()
        topLeftPath.move(to: CGPoint(x: 0, y: cornerLength))
        topLeftPath.addLine(to: CGPoint(x: 0, y: 0))
        topLeftPath.addLine(to: CGPoint(x: cornerLength, y: 0))
        topLeft.path = topLeftPath.cgPath
        topLeft.strokeColor = cornerColor
        topLeft.lineWidth = cornerWidth
        topLeft.fillColor = UIColor.clear.cgColor
        topLeft.lineCap = .round

        // Top-right corner
        let topRight = CAShapeLayer()
        let topRightPath = UIBezierPath()
        topRightPath.move(to: CGPoint(x: 280 - cornerLength, y: 0))
        topRightPath.addLine(to: CGPoint(x: 280, y: 0))
        topRightPath.addLine(to: CGPoint(x: 280, y: cornerLength))
        topRight.path = topRightPath.cgPath
        topRight.strokeColor = cornerColor
        topRight.lineWidth = cornerWidth
        topRight.fillColor = UIColor.clear.cgColor
        topRight.lineCap = .round

        // Bottom-left corner
        let bottomLeft = CAShapeLayer()
        let bottomLeftPath = UIBezierPath()
        bottomLeftPath.move(to: CGPoint(x: 0, y: 280 - cornerLength))
        bottomLeftPath.addLine(to: CGPoint(x: 0, y: 280))
        bottomLeftPath.addLine(to: CGPoint(x: cornerLength, y: 280))
        bottomLeft.path = bottomLeftPath.cgPath
        bottomLeft.strokeColor = cornerColor
        bottomLeft.lineWidth = cornerWidth
        bottomLeft.fillColor = UIColor.clear.cgColor
        bottomLeft.lineCap = .round

        // Bottom-right corner
        let bottomRight = CAShapeLayer()
        let bottomRightPath = UIBezierPath()
        bottomRightPath.move(to: CGPoint(x: 280 - cornerLength, y: 280))
        bottomRightPath.addLine(to: CGPoint(x: 280, y: 280))
        bottomRightPath.addLine(to: CGPoint(x: 280, y: 280 - cornerLength))
        bottomRight.path = bottomRightPath.cgPath
        bottomRight.strokeColor = cornerColor
        bottomRight.lineWidth = cornerWidth
        bottomRight.fillColor = UIColor.clear.cgColor
        bottomRight.lineCap = .round

        view.layer.addSublayer(topLeft)
        view.layer.addSublayer(topRight)
        view.layer.addSublayer(bottomLeft)
        view.layer.addSublayer(bottomRight)
    }

    // MARK: - Camera Setup
    private func setupCamera() {
        captureSession = AVCaptureSession()

        guard let videoCaptureDevice = AVCaptureDevice.default(for: .video) else {
            showError("Camera not available")
            return
        }

        let videoInput: AVCaptureDeviceInput
        do {
            videoInput = try AVCaptureDeviceInput(device: videoCaptureDevice)
        } catch {
            showError("Camera input error: \(error.localizedDescription)")
            return
        }

        if captureSession.canAddInput(videoInput) {
            captureSession.addInput(videoInput)
        } else {
            showError("Cannot add camera input")
            return
        }

        let metadataOutput = AVCaptureMetadataOutput()

        if captureSession.canAddOutput(metadataOutput) {
            captureSession.addOutput(metadataOutput)
            metadataOutput.setMetadataObjectsDelegate(self, queue: DispatchQueue.main)
            metadataOutput.metadataObjectTypes = supportedBarcodeTypes
        } else {
            showError("Cannot add metadata output")
            return
        }

        videoPreviewLayer = AVCaptureVideoPreviewLayer(session: captureSession)
        videoPreviewLayer.frame = scanningView.layer.bounds
        videoPreviewLayer.videoGravity = .resizeAspectFill
        scanningView.layer.addSublayer(videoPreviewLayer)
    }

    override func viewDidLayoutSubviews() {
        super.viewDidLayoutSubviews()
        videoPreviewLayer?.frame = scanningView.layer.bounds
    }

    // MARK: - Scanning Control
    private func startScanning() {
        if !isScanning {
            DispatchQueue.global(qos: .background).async {
                self.captureSession.startRunning()
            }
            isScanning = true
            statusLabel.text = "Scanning for barcodes..."

            // Add subtle animation to reticle
            animateReticle()
        }
    }

    private func stopScanning() {
        if isScanning {
            captureSession.stopRunning()
            isScanning = false
            statusLabel.text = "Scanner stopped"
        }
    }

    private func animateReticle() {
        UIView.animate(withDuration: 1.0, delay: 0, options: [.repeat, .autoreverse, .allowUserInteraction], animations: {
            self.reticleView.alpha = 0.5
        })
    }

    // MARK: - Actions
    @objc private func closeButtonTapped() {
        // Haptic feedback
        let impactFeedback = UIImpactFeedbackGenerator(style: .medium)
        impactFeedback.impactOccurred()

        delegate?.barcodeScannerDidCancel()
        dismiss(animated: true)
    }

    @objc private func flashButtonTapped() {
        toggleFlash()

        // Haptic feedback
        let impactFeedback = UIImpactFeedbackGenerator(style: .light)
        impactFeedback.impactOccurred()
    }

    private func toggleFlash() {
        guard let device = AVCaptureDevice.default(for: .video), device.hasTorch else {
            return
        }

        do {
            try device.lockForConfiguration()

            if flashOn {
                device.torchMode = .off
                flashButton.setTitle("🔦", for: .normal)
            } else {
                try device.setTorchModeOn(level: 1.0)
                flashButton.setTitle("🔆", for: .normal)
            }

            flashOn.toggle()
            device.unlockForConfiguration()
        } catch {
            print("Flash toggle error: \(error)")
        }
    }

    private func showError(_ message: String) {
        statusLabel.text = "Error: \(message)"
        statusLabel.textColor = .systemRed

        DispatchQueue.main.asyncAfter(deadline: .now() + 2.0) {
            self.delegate?.barcodeScannerDidFail(with: message)
        }
    }

    private func handleSuccessfulScan(barcode: String, format: String) {
        // Stop scanning immediately
        stopScanning()

        // Haptic and audio feedback
        let impactFeedback = UIImpactFeedbackGenerator(style: .heavy)
        impactFeedback.impactOccurred()
        AudioServicesPlaySystemSound(1016) // Camera shutter sound

        // Visual feedback
        reticleView.layer.borderColor = UIColor.systemGreen.cgColor
        statusLabel.text = "Barcode detected!"
        statusLabel.textColor = .systemGreen

        // Brief delay for user feedback, then return result
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
            self.delegate?.barcodeScannerDidScanBarcode(barcode, format: format)
            self.dismiss(animated: true)
        }
    }
}

// MARK: - AVCaptureMetadataOutputObjectsDelegate
extension NativeBarcodeScannerViewController: AVCaptureMetadataOutputObjectsDelegate {
    func metadataOutput(_ output: AVCaptureMetadataOutput, didOutput metadataObjects: [AVMetadataObject], from connection: AVCaptureConnection) {

        guard let metadataObject = metadataObjects.first,
              let readableObject = metadataObject as? AVMetadataMachineReadableCodeObject,
              let stringValue = readableObject.stringValue else {
            return
        }

        // Determine barcode format
        let format = getBarcodeFormatName(readableObject.type)

        // Handle successful scan
        handleSuccessfulScan(barcode: stringValue, format: format)
    }

    private func getBarcodeFormatName(_ objectType: AVMetadataObject.ObjectType) -> String {
        switch objectType {
        case .upce:
            return "UPC_E"
        case .code39:
            return "CODE_39"
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
            return "UNKNOWN"
        }
    }
}