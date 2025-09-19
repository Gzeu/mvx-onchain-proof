import React from 'react';
import { ProofData } from '../types/proof';
import { formatTimestamp } from '../utils/formatters';
import { QRCodeSVG } from 'qrcode.react';
import { 
  ClipboardDocumentIcon, 
  ShareIcon, 
  PencilIcon,
  QrCodeIcon,
  CheckBadgeIcon
} from '@heroicons/react/24/outline';

interface ProofCardProps {
  proof: ProofData;
  onEdit?: (proof: ProofData) => void;
  onShare?: (proof: ProofData) => void;
  showQR?: boolean;
  className?: string;
}

export const ProofCard: React.FC<ProofCardProps> = ({
  proof,
  onEdit,
  onShare,
  showQR = false,
  className = ''
}) => {
  const [showQRCode, setShowQRCode] = React.useState(showQR);
  const [copied, setCopied] = React.useState(false);

  const handleCopyProofId = async () => {
    try {
      await navigator.clipboard.writeText(proof.proof_id);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy proof ID:', error);
    }
  };

  const getProofTypeFromText = (proofText: string): string => {
    if (proofText.includes('CERTIFICATE') || proofText.includes('CERT')) return 'certificate';
    if (proofText.includes('BADGE') || proofText.includes('ACHIEVEMENT')) return 'badge';
    if (proofText.includes('HACKATHON') || proofText.includes('EVENT')) return 'event';
    if (proofText.includes('COURSE') || proofText.includes('TRAINING')) return 'education';
    return 'general';
  };

  const getProofIcon = (type: string) => {
    switch (type) {
      case 'certificate':
        return '🎓';
      case 'badge':
        return '🏅';
      case 'event':
        return '🎉';
      case 'education':
        return '📚';
      default:
        return '📜';
    }
  };

  const getProofColor = (type: string): string => {
    switch (type) {
      case 'certificate':
        return 'from-blue-500 to-blue-700';
      case 'badge':
        return 'from-yellow-500 to-yellow-700';
      case 'event':
        return 'from-purple-500 to-purple-700';
      case 'education':
        return 'from-green-500 to-green-700';
      default:
        return 'from-gray-500 to-gray-700';
    }
  };

  const proofType = getProofTypeFromText(proof.proof_text);
  const proofIcon = getProofIcon(proofType);
  const proofColor = getProofColor(proofType);
  
  // Generate verification URL for QR code
  const verificationUrl = `${window.location.origin}/verify/${proof.proof_id}`;

  const parseMetadata = (metadata: string) => {
    try {
      return JSON.parse(metadata);
    } catch {
      return null;
    }
  };

  const metadataObj = parseMetadata(proof.metadata);

  return (
    <div className={`
      bg-white dark:bg-gray-800 rounded-xl shadow-lg hover:shadow-xl 
      transition-all duration-300 border border-gray-200 dark:border-gray-700
      overflow-hidden group ${className}
    `}>
      {/* Header with gradient background */}
      <div className={`bg-gradient-to-r ${proofColor} p-4 text-white`}>
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <div className="text-3xl">{proofIcon}</div>
            <div>
              <h3 className="font-bold text-lg leading-tight">
                {proof.proof_text.length > 40 
                  ? `${proof.proof_text.substring(0, 40)}...` 
                  : proof.proof_text}
              </h3>
              <p className="text-sm opacity-90 mt-1">
                Created {formatTimestamp(proof.timestamp)}
              </p>
            </div>
          </div>
          <CheckBadgeIcon className="h-6 w-6 opacity-80" />
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Proof ID */}
        <div className="mb-4">
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
            Proof ID
          </label>
          <div className="flex items-center space-x-2">
            <code className="flex-1 text-sm bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded font-mono truncate">
              {proof.proof_id}
            </code>
            <button
              onClick={handleCopyProofId}
              className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
              title="Copy Proof ID"
            >
              <ClipboardDocumentIcon className="h-4 w-4" />
            </button>
          </div>
          {copied && (
            <p className="text-xs text-green-600 mt-1">Copied to clipboard!</p>
          )}
        </div>

        {/* Metadata */}
        {metadataObj && (
          <div className="mb-4">
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
              Details
            </label>
            <div className="space-y-1">
              {Object.entries(metadataObj).map(([key, value]) => (
                <div key={key} className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400 capitalize">
                    {key.replace(/([A-Z])/g, ' $1').toLowerCase()}:
                  </span>
                  <span className="text-gray-900 dark:text-gray-100 font-medium">
                    {String(value)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* QR Code */}
        {showQRCode && (
          <div className="mb-4 flex justify-center">
            <div className="bg-white p-3 rounded-lg border">
              <QRCodeSVG 
                value={verificationUrl}
                size={120}
                level="M"
                includeMargin={true}
              />
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-gray-200 dark:border-gray-600">
          <div className="flex space-x-2">
            <button
              onClick={() => setShowQRCode(!showQRCode)}
              className="inline-flex items-center px-3 py-1 text-xs font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              <QrCodeIcon className="h-3 w-3 mr-1" />
              QR
            </button>
            
            {onShare && (
              <button
                onClick={() => onShare(proof)}
                className="inline-flex items-center px-3 py-1 text-xs font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                <ShareIcon className="h-3 w-3 mr-1" />
                Share
              </button>
            )}
          </div>
          
          {onEdit && (
            <button
              onClick={() => onEdit(proof)}
              className="inline-flex items-center px-3 py-1 text-xs font-medium text-blue-700 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30 rounded-full hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
            >
              <PencilIcon className="h-3 w-3 mr-1" />
              Edit
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProofCard;