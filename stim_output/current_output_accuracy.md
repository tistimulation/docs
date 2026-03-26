---
title: Current Output Accuracy
layout: default
parent: Testing Stimulator Outputs
nav_order: 2
---

# Testing Stimulator Current Output Accuracy
The tester should test each TI channel independently for this test, i.e. if channel 1 is outputting current, then channel 2 should be switched off - and vice versa.

## Procedure - Comparing Actual Current Amplitude to Programmed Current Amplitude

This test procedure covers to how to verify the actual current amplitude matches the programmed current amplitude of the stimulator.

1. Connect the active and return of TI channel 1 to the left side of the resistive network.
2. Connect the active and return of TI channel 2 to the right side of the resistive network.
3. Program the stimulator channel 1 to output with frequency *f*, amplitude *I1*; and stimulator channel 2 to output with amplitude 0mA.
4. Connect an oscilloscope or DAQ probe across R2 (note - make sure the DAQ or scope is taking a differential voltage reading and not referring the BNC inner conductor potential to the instrument's ground potential).
5. Record the amplitude (0 to peak) voltage value, and divide this by the resistance value of R2. Compare the resulting value to the programmed current amplitude.
6. Program the stimulator channel 1 to output with amplitude 0mA; and stimulator channel 2 to output with frequency *f* amplitude *I2*.
7. Connect an oscilloscope or DAQ probe across R4 (note - make sure the DAQ or scope is taking a differential voltage reading and not referring the BNC inner conductor potential to the instrument's ground potential).
8. Record the amplitude (0 to peak) voltage value, and divide this by the resistance value of R4. Compare the resulting value to the programmed current amplitude.

Analysing the output of steps 5 and 8, ensure that the programmed current amplitudes is acceptably close to the actual current amplitudes. A non-negligble mismatch indicates a hardware fault, or connection issue.
