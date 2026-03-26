---
title: Current Frequency Response
layout: default
parent: Testing Stimulator Outputs
nav_order: 3
---

# Testing Stimulator Current Output Frequency Response
The tester should test each TI channel independently for this test, i.e. if channel 1 is outputting current, then channel 2 should be switched off - and vice versa.

## Procedure - Assessing Frequency Response of Stimulator Output

This test procudure covers how to verify the stimulation frequency is within the capability of the stimulator used. Example starting frequency of 1kHz is used here and the range of testing frequencies is not defined - it is up to the tester to determine which frequencies are of interest to their use cases.

1. Connect the active and return of TI channel 1 to the left side of the resistive network.
2. Connect the active and return of TI channel 2 to the right side of the resistive network.
3. Program the stimulator to output at amplitude *I1* on channel 1 and 0mA on channel 2. Program the frequency of the waveform on channel 1 to 1kHz (just an example starting point).
4. Connect an oscilloscope or DAQ probe across R2 (note - make sure the DAQ or scope is taking a differential voltage reading and not referring the BNC inner conductor potential to the instrument's ground potential).
5. Record the amplitude (0 to peak) voltage value, and divide this by the resistance value of R2 (Ohm's Law).
6. Repeat steps 3 to 5, varying the frequency of channel oscillation. Record the output of step 5 for each frequency value, i.e. the voltage amplitude at R2 divided by R2 resistance in Ohms each time.
7. For each recording, do a Decibel transformation *10\*log10(V)*. The decibel transformation will allow better visualisation of the frequency response, where 0dB means there is no loss in amplitude for the corresponding frequency.
8. Program the stimulator to output 0mA on channel 1 and *I2* on channel 2. Program the frequency of the waveform on channel 2 to 1kHz.
9. Connect an oscilloscope or DAQ probe across R4 (note - make sure the DAQ or scope is taking a differential voltage reading and not referring the BNC inner conductor potential to the instrument's ground potential).
10. Record the amplitude (0 to peak) voltage value, and divide this by R4 resistance in Ohms (Ohm's Law).
11. Repeat steps 8 to 10, varying the frequency of channel oscillation. Record the output of step 10 for each frequency value, i.e. the voltage amplitude at R4 divided by R4 resistance in Ohms each time.
12. For each recording, do a Decibel transformation *10\*log10(V)*. The decibel transformation will allow better visualisation of the frequency response, where 0dB means there is no loss in amplitude for the corresponding frequency.

Analysing the output of steps 7 and 12, ensure that the attenuation (if any) at the Temporal Interference carrier frequencies to be used in human-experiments is acceptable. If the attenuation is non-negligble, consult the datasheet of the stimulator in use to ensure the frequency is within the advertised output bandwidth. If it is within the advertised bandwidth, non-neglible attenuation indicates a hardware-fault or connection issue.
