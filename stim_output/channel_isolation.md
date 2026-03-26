---
title: Channel Isolation (Crosstalk)
layout: default
parent: Testing Stimulator Outputs
nav_order: 4
---

# Testing Stimulator Channel Isolation
This test procedure covers how to verify the current waveforms being delivered by each channel of the stimulator are isolated from eachother at the source.

1. Connect the active and return of TI channel 1 to the left side of the resistive network.
2. Connect the active and return of TI channel 2 to the right side of the resistive network.
3. Program the stimulator channel 1 to output with frequency *f*, amplitude *I1*; and stimulator channel 2 to output with amplitude frequency *f+df*, amplitude *I2*.
4. Connect an oscilloscope or DAQ probe to the voltage across the output of the current source 1, VOut1 referred to VOut2 (note - make sure the DAQ or scope is taking a differential voltage reading and not referring the BNC inner conductor potential to the instrument's ground potential). **The tester should observe a waveform with amplitude modulation index: I2\*(Rsum)/(I1\*(Rsum+R1+R2))**.
5. Connect an oscilloscope or DAQ probe to the voltage across the output of the current source 2, VOut3 referred to VOut4 (note - make sure the DAQ or scope is taking a differential voltage reading and not referring the BNC inner conductor potential to the instrument's ground potential - nor short-circuiting the outer conductor of the BNC to the outer conductor of any other connected BNC). **The tester should observe a waveform with amplitude modulation index: I1\*(Rsum)/(I2\*(Rsum+R3+R4))**.
6. Connect an oscilloscope or DAQ probe across R2 (note - make sure the DAQ or scope is taking a differential voltage reading and not referring the BNC inner conductor potential to the instrument's ground potential). **The tester should observe a waveform with 0% amplitude modulation**.
7. Connect an oscilloscope or DAQ probe across R4 (note - make sure the DAQ or scope is taking a differential voltage reading and not referring the BNC inner conductor potential to the instrument's ground potential). **The tester should observe a waveform with 0% amplitude modulation**.
8. Connect an oscilloscope or DAQ probe across R7 (note - make sure the DAQ or scope is taking a differential voltage reading and not referring the BNC inner conductor potential to the instrument's ground potential - nor short-circuiting the outer conductor of the BNC to the outer conductor of any other connected BNC). **The tester should observe a waveform with 100% amplitude modulation, with an envelope oscillating at df Hz**.

**Note** that if the output of either step 6 or step 7 **was not** a waveform with 0% amplitude modulation, then the current sources are not adequately isolated, indicating a hardware fault or connection error. The results of steps 4,5 and 8 will indicate which current source channel is problematic.
