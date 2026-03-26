---
title: Home
layout: home
nav_order: 1
---

This page details what protocols and procedures can be used for some basic TI hardware testing.

Note that the test load used throughout these protocols is a resistive network in a H-Bridge topology. An understanding of [Ohm's Law](https://en.wikipedia.org/wiki/Ohm%27s_law) is recommended.

![Image](/pics/resistor-load.png)

The exact resistor values to be used should be determined according to the electrode montage to be used in human experiments and observed impedances there. [The guide for this process is below](#choosing-resistor-values).

This document will make reference to the following variables:

|Label|Type|Unit|Detail|
|-|-|-|-|
|f|Frequency|Hz|The carrier frequency for Temporal Interference to be defined by the tester for their respective experiment objectives|
|I1|Current|mA|The current amplitude for Temporal Interference channel 1, to be defined by the tester for their respective experiment objectives|
|I2|Current|mA|The current amplitude for Temporal Interference channel 2, to be defined by the tester for their respective experiment objectives|
|Rsum|Resistance|Ohms|The sum of the impedance magnitudes for all impedances in R5, R6, R7 and R8.|

