export type PageTextCaptureResult =
  | {
      success: true;
      title: string;
      url: string;
      text: string;
    }
  | {
      success: false;
      reason: string;
    };
