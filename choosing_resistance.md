---
title: Choosing Resistance Values
layout: default
nav_order: 6
---

# Choosing Resistor Values
The process for determining which physical electrode locations should be used for stimulation/recording is to be determined by the research and/or lab for their study's objectives.

Stimulation electrodes (1x active and 1x return per waveform, 4 electrodes total) should be placed on the scalp of a human participant. EEG electrodes should be placed on the scalp for EEG reference and ground. One more EEG electrode should be selected for probing. There should be seven total electrodes on the scalp at least.

Temporal Interference stimulation should be powered on for both channels at the carrier frequencies as defined in a given lab's particular study objective(s). The current amplitude should be set to the target value to be used, again, as defined in a given lab's particular study objective(s). **It is critical that the set current in Amps and set frequency in Hertz are maintained when testing resulting impedance magnitudes on the PCB.**

While stimulation is active, using a DAQ or oscilloscope, the following parameters should be recorded:

* Potential difference envelope (V) between the active and return electrodes for TI waveform 1 (VOut1 referred to VOut2), maximum voltage and amplitude modulation index.
* Potential difference envelope (V) between the active and return electrodes for TI waveform 2 (VOut3 referred to VOut4), maximum voltage and amplitude modulation index.
* Amplitude Modulation Index of VOut1 referred to VOut2 and VOut3 referred to VOut4 respectively.
* Maximum potential difference (V) between EEG Signal and EEG Ground (EEG_Sig)
* Maximum potential difference (V) between EEG Reference and EEG Ground (EEG_Ref)

These four parameters should be recorded across a variety of human participants (with the same electrode locations) to capture an understanding of variation. These parameters will determine the target voltage parameters when defining impedance values to use in the PCB.

R6 and R7 are used to tune voltage amplitudes for EEG_Sig and EEG_Ref. Divide the maximum measured EEG Signal voltage by the sum of both delivered current amplitudes to derive the resistance that is R6 and R7. Divide the maximum measured EEG Reference voltage by the sum of both delivered current amplitudes to derive the resistance that is R7 alone. R6 can be then be derived by subtracting R7 from (R6+R7).

* The sum of R5+R6+R7+R8 defines the total 'common impedance' which both current source outputs see. This will affect the amplitude modulation index of each output voltage (VOut1 referred to VOut2, and VOut3 referred to VOut 4).
* (R1+R2+R5+R6+R7+R8) should be determined such as to match the total impedance magnitude seen by current source 1.
* (R3+R4+R5+R6+R7+R8) should be determined such as to match the total impedance magnitude seen by current source 2.
* (R5+R6+R7+R8)/(R1+R2+R5+R6+R7+R8) should be determined such as to match amplitude modulation index observed at the voltage output of current source 1 (VOut1 referred to VOut2).
* (R5+R6+R7+R8)/(R3+R4+R5+R6+R7+R8) should be determined such as to match amplitude modulation index observed at the voltage output of current source 2 (VOut3 referred to VOut4).

# Example
Both TI currents are connected to the head at the appropriate locations. They both output at 2mA. EEG Signal, Reference and Ground and placed on the head at the appropriate locations. Both TI Currents are activated.
* The voltage observed between EEG Signal and EEG Ground has a maximum measurement of 200mV.
* The voltage observed between EEG Signal and EEG Ground has a maximum measurement of 20mV.
* The voltage envelope observed between VOut1 and VOut2 oscillates around 4.05V, reaching maximum of 4.25V (~5% AMI).
* The voltage envelope observed between VOut3 and VOut4 oscillates around 4.45V, reaching maximum of 4.65V (~4.5% AMI).

1. 200mV divided by 4mA is 50 Ohms. R6+R7 must sum to 50 Ohms.
2. 20mV divided by 4mA is 5 Ohms. R7 is 5Ohms. R6 is 45 Ohms.
3. 4.05V divided by 2mA is 2.025 kOhms. (R1+R2+R5+R6+R7+R8) must be 2.025 kOhms.
4. 4.45 divided by 2mA is 2.225 kOhms. (R3+R4+R5+R6+R7+R8) must be 2.225 kOhms.
5. 2.225 kOhms multiplied by 0.045 is 100.125 Ohms. 2.025 kOhms multiplied by 0.05 is 101.25 Ohms. Average is ~101 Ohms, (R5+R6+R7+R8) must be 101 Ohms.
6. R6+R7 is 50 Ohms (step 1), R5+R8 must be 51 Ohms. Divide equally for R5 and R8 equal to 25.5 Ohms each.
7. (R1+R2+R5+R6+R7+R8) must be 2.025 kOhms (step 3). (R5+R6+R7+R8) must be 101 Ohms (step 5). R1+R2 must be 1924, divide equally for R1 and R2 equal to 962 Ohms each.
8. (R3+R4+R5+R6+R7+R8) must be 2.225 kOhms (step 4). (R5+R6+R7+R8) must be 101 Ohms (step 5). R3+R4 must be 2124, divide equally for R1 and R2 equal to 1062 Ohms each.

