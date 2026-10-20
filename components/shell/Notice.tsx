import { Icon } from '@/components/ui/Icon';

export function Notice() {
  return (
    <div className="notice">
      <div className="wrap">
        <Icon name="camera" />
        <span className="notice__long">See any frame on your face, live. Press <b>Frame My Face</b> on a frame.</span>
        <span className="notice__short">Try any frame on your face, live.</span>
      </div>
    </div>
  );
}
