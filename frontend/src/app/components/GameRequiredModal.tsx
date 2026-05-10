import { motion, AnimatePresence } from 'motion/react';
import { Ticket } from 'lucide-react';
import { Button } from './design-system';

interface GameRequiredModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function GameRequiredModal({ isOpen, onClose, onConfirm }: GameRequiredModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="cb-modal-backdrop"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="cb-modal"
          >
            <div className="cb-modal__icon">
              <Ticket size={30} strokeWidth={2.2} />
            </div>

            <h3 className="cb-modal__title">
              해당 기능은 경기 관람 중에만 가능해요.
            </h3>

            <p className="cb-modal__body">
              현재 관람 중이신가요?
            </p>

            <div className="cb-stack cb-modal__actions">
              <Button
                onClick={onConfirm}
                fullWidth
                size="lg"
              >
                경기 등록하러 가기
              </Button>
              <Button
                onClick={onClose}
                variant="ghost"
                fullWidth
              >
                취소
              </Button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
