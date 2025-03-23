import { addSnackbar } from '../components/snackbar/useSnackbarsStore';
import { Is, isBrowser } from './pwaUtils';
import mermaid from 'mermaid';

export function copyToClipboard(text: string, typeLabel: string) {
  if (!isBrowser)
    return;
  if (!window.navigator.clipboard?.writeText) {
    alert('Clipboard access is blocked. Please enable it in your browser settings.');
    return;
  }
  window.navigator.clipboard.writeText(text)
    .then(() => {
      addSnackbar({
        key: 'copy-to-clipboard',
        message: `${typeLabel} copied to clipboard`,
        type: 'success',
        closeButton: false,
        overrides: {
          autoHideDuration: 2000,
        },
      });
    })
    .catch((err) => {
      alert(`Failed to message to clipboard${err?.name ? ' (' + err.name + ')' : ''}.\n\n${err?.message || 'Unknown error, likely a permission issue.'}`);
    });
}

export function copyBlobPromiseToClipboard(mimeType: string, blobPromise: Promise<Blob>, typeLabel: string) {
  if (!isBrowser)
    return;
  if (!navigator.clipboard || !navigator.clipboard.write) {
    alert('Clipboard access is blocked or not supported in this browser.');
    return;
  }
  // Create a ClipboardItem with the Blob
  const clipboardItem = new ClipboardItem({ [mimeType]: blobPromise });

  // Write the ClipboardItem to the clipboard
  navigator.clipboard.write([clipboardItem])
    .then(() => {
      addSnackbar({
        key: 'copy-blob-to-clipboard',
        message: `${typeLabel} copied to clipboard`,
        type: 'success',
        closeButton: false,
        overrides: {
          autoHideDuration: 2000,
        },
      });
    })
    .catch((err) => {
      const [media, type] = mimeType.split('/');
      alert(`Failed to copy ${type?.toUpperCase()} ${media} to clipboard${err?.name ? ' (' + err.name + ')' : ''}.\n\n${err?.message || 'Unknown error, likely a permission issue.'}`);
    });
}

export const copyMermaidImageToClipboard = async (mermaidCode: string, isMermaidDiagram: boolean): Promise<void> => {
  if (typeof window === "undefined" || !isMermaidDiagram || !mermaidCode) return;
  
  let tempContainer: HTMLDivElement | null = null;
  let tempContainerAdded: boolean = false;
  
  try {
    mermaid.initialize({
      startOnLoad: false,
      securityLevel: 'loose'
    });
    
    // Create a unique ID
    const id: string = `mermaid-diagram-${Date.now()}`;
    
    // Create a temporary container that's visible but offscreen
    // This is important for correct size calculation
    tempContainer = document.createElement('div');
    tempContainer.id = id;
    tempContainer.style.position = 'absolute';
    tempContainer.style.left = '-9999px';
    tempContainer.style.top = '0';
    // Don't hide with visibility:hidden as it can affect size calculations
    document.body.appendChild(tempContainer);
    tempContainerAdded = true;
    
    // Render the mermaid diagram
    const { svg }: { svg: string } = await mermaid.render(id, mermaidCode);
    
    // Create an SVG element with the rendered content to measure proper dimensions
    const tempSvg: HTMLDivElement = document.createElement('div');
    tempSvg.innerHTML = svg;
    const svgElement = tempSvg.firstChild as SVGSVGElement;
    document.body.appendChild(tempSvg);
    
    // Check if SVG has viewBox attribute - extract dimensions from there if present
    let width: number;
    let height: number;
    
    if (svgElement.getAttribute('viewBox')) {
      const viewBox = svgElement.getAttribute('viewBox')?.split(' ') || [];
      // viewBox format: min-x min-y width height
      width = parseFloat(viewBox[2] || '0');
      height = parseFloat(viewBox[3] || '0');
    } else if (svgElement.width.baseVal.unitType !== SVGLength.SVG_LENGTHTYPE_PERCENTAGE) {
      // Use explicit width/height if they're not percentages
      width = svgElement.width.baseVal.value;
      height = svgElement.height.baseVal.value;
    } else {
      // Last resort - compute the bounding box
      // This won't catch elements outside the viewport but it's a start
      const bbox = svgElement.getBBox();
      width = bbox.width + bbox.x;
      height = bbox.height + bbox.y;
    }
    
    // Add some padding and ensure minimum dimensions
    width = Math.max(width, 100) + 40; // More padding
    height = Math.max(height, 100) + 40;
    
    // Create a canvas with the full dimensions
    const canvas: HTMLCanvasElement = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx: CanvasRenderingContext2D | null = canvas.getContext('2d');
    
    if (!ctx) {
      throw new Error("Failed to get canvas context");
    }
    
    // Set white background
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, width, height);
    
    // Create a new image using the SVG data
    const img: HTMLImageElement = new Image();
    
    // Modified SVG to ensure it respects dimensions
    // We'll update the SVG to include explicit width/height
    const parser = new DOMParser();
    const svgDoc = parser.parseFromString(svg, 'image/svg+xml');
    const svgRoot = svgDoc.documentElement;
    
    // Set explicit width and height on the SVG
    svgRoot.setAttribute('width', width.toString());
    svgRoot.setAttribute('height', height.toString());
    
    // If there's no viewBox, add one
    if (!svgRoot.hasAttribute('viewBox')) {
      svgRoot.setAttribute('viewBox', `0 0 ${width} ${height}`);
    }
    
    // Convert modified SVG to a string and use as source
    const serializer = new XMLSerializer();
    const modifiedSvg = serializer.serializeToString(svgRoot);
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(modifiedSvg)));
    
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = (e: Event | string) => reject(e);
    });
    
    // Draw the entire image onto the canvas, preserving dimensions
    ctx.drawImage(img, 0, 0, width, height);
    
    // Convert to blob and copy to clipboard
    try {
      const blob: Blob = await new Promise<Blob>(resolve =>
        canvas.toBlob((b: Blob | null) => resolve(b || new Blob()), 'image/png', 1.0) // 1.0 for highest quality
      );
      
      const clipboardItem: ClipboardItem = new ClipboardItem({ 'image/png': blob });
      await navigator.clipboard.write([clipboardItem]);
      addSnackbar({
        key: 'copy-blob-to-clipboard',
        message: `Diagram copied to clipboard`,
        type: 'success',
        closeButton: false,
        overrides: {
          autoHideDuration: 2000,
        },
      });
    } catch (clipErr) {
      console.warn("PNG clipboard write failed:", clipErr);
      
      // Fallback: open in new tab for manual save
      const dataUrl: string = canvas.toDataURL('image/png');
      const newTab: Window | null = window.open();
      if (newTab) {
        newTab.document.write(`<img src="${dataUrl}" alt="Mermaid Diagram">`);
        alert("Could not copy directly. Image opened in new tab for manual saving.");
      } else {
        alert("Could not open new tab. Please check your browser settings.");
      }
    }
    
    // Clean up
    document.body.removeChild(tempSvg);
    
  } catch (err) {
    console.error("❌ Error copying image:", err);
    alert("Could not copy Mermaid diagram: " + (err instanceof Error ? err.message : String(err)));
  } finally {
    // Clean up the temporary container
    if (tempContainerAdded && tempContainer && document.body.contains(tempContainer)) {
      document.body.removeChild(tempContainer);
    }
  }
};

export function supportsClipboardRead() {
  return !Is.Browser.Firefox;
}

export async function getClipboardItems(): Promise<ClipboardItem[] | null> {
  if (!isBrowser || !window.navigator.clipboard?.read)
    return [];
  try {
    return await window.navigator.clipboard.read();
  } catch (error: any) {
    console.warn('Failed to read clipboard: ', error);
    return null;
  }
}