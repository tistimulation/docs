---
title: Intermodulation Distortion
layout: default
parent: Concurrent EEG
nav_order: 2
---

# Testing Intermodulation Distortion
Recording instrumentation (EEG or DAQ; with or without filters) is required for performing this test; and any dedicated filters that are to be used at the interface to the instrumentation.

This test procedure covers how to test for presence of intermodulation distortion in the stimulator or the recording filter/amplifier.

1. Connect the active and return of TI channel 1 to the left side of the resistive network.
2. Connect the active and return of TI channel 2 to the right side of the resistive network.
3. Program the stimulator channel 1 to output with frequency *f*, amplitude *I1*; and stimulator channel 2 to output with amplitude frequency *f+df*, amplitude *I2*.
4. Connect an oscilloscope or DAQ to probe across the sum of R6 and R7 (EEG_Sig referred to EEG_Gnd) (note - make sure the DAQ or scope is taking a differential voltage reading and not referring the BNC inner conductor potential to the instrument's ground potential).
5. Connect an oscilloscope or DAQ to probe across the sum of R7 (EEG_Ref referred to EEG_Gnd) (note - make sure the DAQ or scope is taking a differential voltage reading and not referring the BNC inner conductor potential to the instrument's ground potential).
6. Manually ensure that the maximum voltage amplitude observed on either voltage probe is within the safe input range for the recording instrumentation. Record maximum voltage amplitudes for EEG_Ref and EEG_Sig, both referred to EEG_Gnd.
7. If the previous step is satisfied (and if using an EEG amplifier for recording instrumentation), connect the 1.5mm Touchproof EEG connectors to the voltage probe points on the resistive network (EEG_Sig, EEG_Ref and EEG_Gnd) to the corresponding inputs of the EEG recording instrumentation: 1x Signal, 1x Reference and 1x GND. Disconnect the scope or DAQ probes, if still connected.
8. Connect an oscilloscope or DAQ to the output voltage of current source 1 (VOut1 referred to VOut2) (note - make sure the DAQ or scope is taking a differential voltage reading and not referring the BNC inner conductor potential to the instrument's ground potential). Record the observed maximum voltage amplitude.
9. Connect an oscilloscope or DAQ to the output voltage of current source 2 (VOut3 referred to VOut4) (note - make sure the DAQ or scope is taking a differential voltage reading and not referring the BNC inner conductor potential to the instrument's ground potential). Record the observed maximum voltage amplitude.
10. Disconnect all scope or DAQ probes from the resistive network, leaving only EEG recording points on the resistive network connected to the EEG recording instrumentation (if using EEG amplifier as recording instrumentation.
11. While the stimulation is still active, record a timeseries for ~4 minutes. Analyse the recorded data in the frequency domain, using the Fourier Transform. [MATLAB function documentation here](https://uk.mathworks.com/help/matlab/ref/fft.html).
12. Analyse the frequency spectral content at *df* Hz (which is the difference in Hz between each carriers; *f* Hz and *f+df* Hz).

If there is no spectral content at *df* Hz (at least no peak above the noise floor), then all hardware (stimulator, filters, amplifiers) are in linear regions of operation and there is no intermodulation distortion **for these voltage parameters**. It is critical to remember that different voltage parameters (as recorded in steps 6, 8 and 9) will move hardware to different regions of linearity and intermodulation distortion contribution will vary. It is therefore important to choose impedance magnitudes on the PCB that correspond to voltage parameters that are observed on the scalp for a given electrode configuration.

If there is spectral content at *df* Hz (a peak above the noise floor), then at least one piece of hardware is a non-linear region of operation and is contaminating the recording with intermodulation distortion. The tester must ensure that the magnitude of the distortion is below relevant noise floors, i.e. of the recording instrumentation or biological. Alternatively, ensure that the contaminated frequency bins are of no use in the analysis of the recorded signals.

Determining which hardware component is contributing the intermodulation distortion can be done by repeating the procedure with varying impedance values. R5, R6, R7 and R8 can all be varied such that the voltage amplitudes at stimulator output (VOut1-VOut2, VOut3-VOut4) can be varied while keeping the same voltage input to recording instrumentation (EEG_Sig, EEG_Ref and EEG_Gnd). The opposite is also true - voltage amplitudes at stimulator output can be kept stationary while varying voltage input to recording instrumentation. For example, increasing the impedance in R5 and R8 will increase the stimulator output voltage, without changing the voltage input to the EEG recording instrumentation. In contrast, increasing the impedance in either R6 or R7 will vary the voltage input to the EEG recording instrumentation, and stimulator output voltage can be kept the same by appropriately attenuating the impedances in R5 and R8 such that the sum of impedances is overall the same.
