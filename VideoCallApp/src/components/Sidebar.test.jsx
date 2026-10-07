import React from "react";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ReduxContext, SocketContext } from "../redux/reduxContextWrapper";
import { Sidebar } from "./Sidebar";

const renderSidebar = (props = {}) => {
  const handlers = {
    onSelectDevice: vi.fn(),
    onToggleScreenShare: vi.fn(),
    onToggleRaisedHand: vi.fn(),
  };
  render(
    <MemoryRouter>
      <ReduxContext.Provider value={[{ localStream: {} }, vi.fn()]}>
        <SocketContext.Provider value={{ leaveRoomFunc: vi.fn() }}>
          <Sidebar
            isPreview={false}
            panels={{}}
            onTogglePanel={vi.fn()}
            messageCount={0}
            trackStatus={{ audio: true, video: true }}
            toggleTrack={vi.fn()}
            deviceOptions={{
              mic: [
                { value: "mic-1", label: "Built-in Mic", active: true, disabled: false },
                { value: "mic-2", label: "USB Mic", active: false, disabled: false },
              ],
              cam: [{ value: "cam-1", label: "Webcam", active: true, disabled: true }],
              spk: [],
            }}
            outputSwitchSupported
            {...handlers}
            {...props}
          />
        </SocketContext.Provider>
      </ReduxContext.Provider>
    </MemoryRouter>
  );
  return handlers;
};

describe("Sidebar", () => {
  it("lists real devices and switches to the one picked", () => {
    const { onSelectDevice } = renderSidebar();

    fireEvent.click(screen.getByLabelText("mic options"));
    fireEvent.click(screen.getByRole("button", { name: /USB Mic/ }));

    expect(onSelectDevice).toHaveBeenCalledWith("audioinput", "mic-2");
  });

  it("does not switch to an unavailable device", () => {
    const { onSelectDevice } = renderSidebar();

    fireEvent.click(screen.getByLabelText("cam options"));
    const webcam = screen.getByRole("button", { name: /Webcam/ });
    expect(webcam).toBeDisabled();
    fireEvent.click(webcam);

    expect(onSelectDevice).not.toHaveBeenCalled();
  });

  it("says so when there are no devices", () => {
    renderSidebar();
    fireEvent.click(screen.getByLabelText("spk options"));
    expect(screen.getByText("No devices found")).toBeInTheDocument();
  });

  it("toggles screen share and raised hand, labelling the current state", () => {
    const { onToggleScreenShare, onToggleRaisedHand } = renderSidebar({ isScreenSharing: true, raisedHand: true });

    fireEvent.click(screen.getByLabelText("Stop sharing"));
    fireEvent.click(screen.getByLabelText("Lower hand"));

    expect(onToggleScreenShare).toHaveBeenCalledTimes(1);
    expect(onToggleRaisedHand).toHaveBeenCalledTimes(1);
  });
});
