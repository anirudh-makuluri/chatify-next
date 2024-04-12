import React, { useRef } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog'
import Cropper, { ReactCropperElement } from "react-cropper";
import "cropperjs/dist/cropper.css";
import { Button } from './ui/button';

type CropperOverlayType = {
	url: string,
	isCropperOverlayVisible: boolean,
	setCropperOverlayVisibility: React.Dispatch<React.SetStateAction<boolean>>,
	saveCroppedImage: (url : string) => void
}

export default function CropperOverlay({ url, isCropperOverlayVisible, setCropperOverlayVisibility, saveCroppedImage } : CropperOverlayType) {
	const cropperRef = useRef<ReactCropperElement>(null);
	
	function handleCrop() {
		const cropper = cropperRef.current?.cropper;
    	saveCroppedImage(cropper?.getCroppedCanvas().toDataURL() || "")
	}
	return (
		<Dialog open={isCropperOverlayVisible} onOpenChange={setCropperOverlayVisibility}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Crop your image</DialogTitle>
				</DialogHeader>
				<Cropper
					src={url}
					style={{ height: 400, width: "100%" }}
					aspectRatio={16 / 16}
					guides={true}
					ref={cropperRef}
				/>
				<Button onClick={handleCrop}>Submit</Button>
			</DialogContent>
		</Dialog>
	)
}

