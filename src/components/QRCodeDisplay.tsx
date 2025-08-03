import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { ArrowLeft, QrCode, Download, Share2, Copy, Check } from 'lucide-react';
import QRCode from 'react-qr-code';

interface QRCodeDisplayProps {
  tournamentId: string;
  tournamentName: string;
  tournamentDate: string;
  onClose: () => void;
  isOpen: boolean;
}

export const QRCodeDisplay = ({ tournamentId, tournamentName, tournamentDate, onClose, isOpen }: QRCodeDisplayProps) => {
  const [copied, setCopied] = useState(false);
  
  // Generate entry URL for the tournament using tournament's actual date
  // Create clean tournament entry URL with tournament name and date
  const encodedTournamentName = encodeURIComponent(tournamentName);
  let entryUrl = `${window.location.origin}/tournament/${tournamentDate}/${encodedTournamentName}?from_qr=true`;
  
  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(entryUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy URL:', error);
    }
  };

  const handleDownloadQR = () => {
    // Get the QR code SVG element
    const svg = document.querySelector('#qr-code-svg');
    if (!svg) return;

    // Create a canvas and draw the SVG
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const data = new XMLSerializer().serializeToString(svg);
    const svgBlob = new Blob([data], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);

    const img = new Image();
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      
      // Download the image
      const link = document.createElement('a');
      link.download = `${tournamentName}-QRコード.png`;
      link.href = canvas.toDataURL();
      link.click();
      
      URL.revokeObjectURL(url);
    };
    img.src = url;
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${tournamentName}のエントリー`,
          text: `${tournamentName}に参加しませんか？`,
          url: entryUrl,
        });
      } catch (error) {
        console.error('Error sharing:', error);
        handleCopyUrl(); // Fallback to copy
      }
    } else {
      handleCopyUrl(); // Fallback to copy
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5 text-primary" />
            エントリー用QRコード
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Tournament Info */}
          <div className="text-center">
            <h3 className="font-semibold text-lg mb-2">{tournamentName}</h3>
            <p className="text-sm text-muted-foreground">
              参加者はこのQRコードをスキャンしてエントリーできます
            </p>
          </div>

          {/* QR Code */}
          <div className="flex justify-center p-6 bg-white rounded-lg border">
            <QRCode
              id="qr-code-svg"
              value={entryUrl}
              size={200}
              level="M"
            />
          </div>

          {/* Entry URL */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">エントリーURL:</Label>
            <div className="flex gap-2">
              <input
                type="text"
                value={entryUrl}
                readOnly
                className="flex-1 px-3 py-2 text-sm border rounded-md bg-muted"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyUrl}
                className="flex items-center gap-1"
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4" />
                    コピー済み
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    コピー
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleDownloadQR}
              className="flex-1 flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              QRコード保存
            </Button>
            <Button
              variant="outline"
              onClick={handleShare}
              className="flex-1 flex items-center gap-2"
            >
              <Share2 className="h-4 w-4" />
              共有
            </Button>
          </div>

          {/* Instructions */}
          <div className="bg-muted/50 p-3 rounded-lg">
            <p className="text-xs text-muted-foreground">
              💡 参加者はスマートフォンのカメラでQRコードをスキャンするか、
              URLを直接アクセスして大会にエントリーできます。
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};