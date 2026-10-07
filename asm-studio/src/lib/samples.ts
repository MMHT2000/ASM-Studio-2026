export interface CodeSample {
  id: string;
  title: string;
  category: 'Basics' | 'Algorithms' | 'Math & BCD' | 'I/O & Strings' | 'Virtual Devices';
  description: string;
  code: string;
}

export const CODE_SAMPLES: CodeSample[] = [
  {
    id: 'hello-world',
    title: 'Hello, World & Basic Loop',
    category: 'Basics',
    description: 'Demonstrates DOS interrupt 21h (string and char printing) and simple arithmetic.',
    code: `; ─────────────────────────────────────────────────────
; Hello World & Loop in 8086 Assembly
; ─────────────────────────────────────────────────────
.model small
.stack 100h

.data
    msg     DB 'Hello from ASM Studio 2026!$'
    num1    DW 42
    num2    DW 58
    result  DW 0

.code
main proc
    MOV AX, @data
    MOV DS, AX

    ; Print greeting using DOS INT 21h, AH=09h
    MOV AH, 09h
    LEA DX, msg
    INT 21h

    ; 42 + 58 = 100 (64h)
    MOV AX, [num1]
    ADD AX, [num2]
    MOV [result], AX

    ; Print 5 dots using LOOP
    MOV CX, 5
count_loop:
    MOV AH, 02h
    MOV DL, '.'
    INT 21h
    LOOP count_loop

    ; Exit to DOS
    MOV AH, 4Ch
    MOV AL, 0
    INT 21h
main endp
END main
`
  },
  {
    id: 'reverse-string',
    title: 'String Reversal (Stack Demo)',
    category: 'I/O & Strings',
    description: 'Uses 8086 stack PUSH and POP instructions to reverse an ASCII string in-place.',
    code: `; ─────────────────────────────────────────────────────
; In-Place String Reversal Using Stack
; ─────────────────────────────────────────────────────
.model small
.stack 100h

.data
    str_before DB 'Original: ASSEMBLY$'
    str_after  DB 'Reversed: $'
    my_str     DB 'ASSEMBLY$'
    str_len    DW 8

.code
main proc
    MOV AX, @data
    MOV DS, AX

    ; Print original
    MOV AH, 09h
    LEA DX, str_before
    INT 21h

    ; Print newline
    MOV AH, 02h
    MOV DL, 0Dh
    INT 21h
    MOV DL, 0Ah
    INT 21h

    ; Push each character onto stack
    MOV CX, [str_len]
    LEA SI, my_str
push_loop:
    MOV AL, [SI]
    MOV AH, 0
    PUSH AX
    INC SI
    LOOP push_loop

    ; Pop reversed chars back into memory
    MOV CX, [str_len]
    LEA DI, my_str
pop_loop:
    POP AX
    MOV [DI], AL
    INC DI
    LOOP pop_loop

    ; Print reversed message
    MOV AH, 09h
    LEA DX, str_after
    INT 21h

    LEA DX, my_str
    INT 21h

    ; Exit
    MOV AH, 4Ch
    MOV AL, 0
    INT 21h
main endp
END main
`
  },
  {
    id: 'bubble-sort',
    title: 'Bubble Sort (Array Sorting)',
    category: 'Algorithms',
    description: 'Sorts an array of 8-bit unsigned integers in ascending order in memory.',
    code: `; ─────────────────────────────────────────────────────
; Bubble Sort Algorithm (Ascending Order)
; Inspect Array in Memory Dump at 0300h after running!
; ─────────────────────────────────────────────────────
.model small
.stack 100h

.data
    arr     DB 64, 25, 12, 22, 11, 90, 80, 5
    arr_len DW 8
    done_msg DB 'Sorting complete! Check memory dump at [arr].$'

.code
main proc
    MOV AX, @data
    MOV DS, AX

    MOV CX, [arr_len]
    DEC CX              ; Outer loop runs (N - 1) times

outer_loop:
    PUSH CX             ; Save outer loop counter on stack
    LEA SI, arr
    MOV DX, CX          ; Inner loop comparisons = remaining elements

inner_loop:
    MOV AL, [SI]
    MOV AH, [SI+1]
    CMP AL, AH
    JBE no_swap         ; If AL <= AH, already in order

    ; Swap elements
    MOV [SI], AH
    MOV [SI+1], AL

no_swap:
    INC SI
    DEC DX
    JNZ inner_loop

    POP CX              ; Restore outer counter
    LOOP outer_loop

    ; Done output
    MOV AH, 09h
    LEA DX, done_msg
    INT 21h

    MOV AH, 4Ch
    MOV AL, 0
    INT 21h
main endp
END main
`
  },
  {
    id: 'simple-calculator',
    title: 'Simple Calculator (+, -, *, /)',
    category: 'Math & BCD',
    description: 'Executes addition, subtraction, multiplication, and division, storing results in variables.',
    code: `; ─────────────────────────────────────────────────────
; 16-Bit Arithmetic Operations (Calculator)
; ─────────────────────────────────────────────────────
.model small
.stack 100h

.data
    op_a     DW 120
    op_b     DW 25
    sum      DW 0
    diff     DW 0
    prod_lo  DW 0
    prod_hi  DW 0
    quot     DW 0
    rem      DW 0
    calc_msg DB 'Calculator completed. Check variables in memory/registers.$'

.code
main proc
    MOV AX, @data
    MOV DS, AX

    ; 1. Addition: 120 + 25 = 145 (91h)
    MOV AX, [op_a]
    ADD AX, [op_b]
    MOV [sum], AX

    ; 2. Subtraction: 120 - 25 = 95 (5Fh)
    MOV AX, [op_a]
    SUB AX, [op_b]
    MOV [diff], AX

    ; 3. Multiplication: 120 * 25 = 3000 (0BB8h)
    MOV AX, [op_a]
    MOV BX, [op_b]
    MUL BX              ; DX:AX = AX * BX
    MOV [prod_lo], AX
    MOV [prod_hi], DX

    ; 4. Division: 120 / 25 = 4, Remainder = 20
    MOV AX, [op_a]
    MOV DX, 0           ; Clear DX for 16-bit division
    MOV BX, [op_b]
    DIV BX              ; AX = quotient, DX = remainder
    MOV [quot], AX
    MOV [rem], DX

    ; Print finish status
    MOV AH, 09h
    LEA DX, calc_msg
    INT 21h

    MOV AH, 4Ch
    MOV AL, 0
    INT 21h
main endp
END main
`
  },
  {
    id: 'bcd-math',
    title: 'BCD & Decimal Arithmetic (DAA / AAA)',
    category: 'Math & BCD',
    description: 'Packed and unpacked Binary Coded Decimal addition using DAA and AAA.',
    code: `; ─────────────────────────────────────────────────────
; Packed and Unpacked BCD Addition
; ─────────────────────────────────────────────────────
.model small
.stack 100h

.data
    ; Packed BCD: 38h + 45h = 83h
    bcd1     DB 38h
    bcd2     DB 45h
    bcd_res  DB 0
    msg      DB 'BCD arithmetic completed.$'

.code
main proc
    MOV AX, @data
    MOV DS, AX

    ; Packed BCD Addition
    MOV AL, [bcd1]
    ADD AL, [bcd2]      ; Binary add: 38h + 45h = 7Dh
    DAA                 ; Decimal Adjust for Addition -> 83h!
    MOV [bcd_res], AL

    ; Unpacked BCD: 7 + 8 = 15 -> AH=1, AL=5
    MOV AL, 7
    MOV BL, 8
    ADD AL, BL          ; 15 (0Fh)
    AAA                 ; ASCII/Unpacked Adjust -> AX = 0105h

    MOV AH, 09h
    LEA DX, msg
    INT 21h

    MOV AH, 4Ch
    MOV AL, 0
    INT 21h
main endp
END main
`
  },
  {
    id: 'traffic-lights',
    title: 'Traffic Lights (Port 0379h)',
    category: 'Virtual Devices',
    description: 'Controls North and South traffic lights via OUT 0379h, AL.',
    code: `; ─────────────────────────────────────────────────────
; Traffic Light Controller (Emu8086 Compatible)
; Switch to the "🚦 Devices" tab to see lights in action!
; Port 0379h bits:
;   North: Red (bit 5), Yellow (bit 4), Green (bit 3)
;   South: Red (bit 2), Yellow (bit 1), Green (bit 0)
; ─────────────────────────────────────────────────────
.model small
.stack 100h

.data
    status_msg DB 'Traffic light cycle completed.$'

.code
main proc
    MOV AX, @data
    MOV DS, AX

    ; State 1: North Green (08h) + South Red (04h) = 0Ch
    MOV DX, 0379h
    MOV AL, 0Ch
    OUT DX, AL

    ; State 2: North Yellow (10h) + South Red (04h) = 14h
    MOV AL, 14h
    OUT DX, AL

    ; State 3: North Red (20h) + South Green (01h) = 21h
    MOV AL, 21h
    OUT DX, AL

    ; State 4: North Red (20h) + South Yellow (02h) = 22h
    MOV AL, 22h
    OUT DX, AL

    ; Print completion message
    MOV AH, 09h
    LEA DX, status_msg
    INT 21h

    MOV AH, 4Ch
    MOV AL, 0
    INT 21h
main endp
END main
`
  },
  {
    id: 'led-counter',
    title: '8-Bit LED Binary Counter (Port 0378h)',
    category: 'Virtual Devices',
    description: 'Counts from 0 to 255 on port 0378h, illuminating the LED Bar Graph.',
    code: `; ─────────────────────────────────────────────────────
; 8-Bit Binary LED Bar Counter
; Switch to the "🚦 Devices" tab to see the LEDs!
; Port 0378h outputs 8 bits directly to the bar.
; ─────────────────────────────────────────────────────
.model small
.stack 100h

.data
    led_msg DB 'LED counter reached 255 (FFh)!$'

.code
main proc
    MOV AX, @data
    MOV DS, AX

    MOV DX, 0378h       ; LED Bar Port
    MOV AL, 0           ; Initial count

count_loop:
    OUT DX, AL          ; Output byte to LEDs
    INC AL
    CMP AL, 0           ; Wraps around after 255
    JNZ count_loop

    ; Final display: All 8 LEDs lit (FFh)
    MOV AL, 0FFh
    OUT DX, AL

    MOV AH, 09h
    LEA DX, led_msg
    INT 21h

    MOV AH, 4Ch
    MOV AL, 0
    INT 21h
main endp
END main
`
  },
  {
    id: 'seven-segment-counter',
    title: '4-Digit 7-Segment Display (Port 0300h)',
    category: 'Virtual Devices',
    description: 'Outputs hex value 1234h to port 0300h to illuminate the 7-segment display.',
    code: `; ─────────────────────────────────────────────────────
; 4-Digit 7-Segment Display Demo
; Switch to the "🚦 Devices" tab to see the digital display!
; Port 0300h takes a 16-bit word to display 4 hex digits.
; ─────────────────────────────────────────────────────
.model small
.stack 100h

.data
    disp_msg DB '7-Segment display output complete (1234h)!$'

.code
main proc
    MOV AX, @data
    MOV DS, AX

    MOV DX, 0300h       ; 7-Segment Display Port
    MOV AX, 1234h       ; Digits: 1, 2, 3, 4
    OUT DX, AX

    MOV AH, 09h
    LEA DX, disp_msg
    INT 21h

    MOV AH, 4Ch
    MOV AL, 0
    INT 21h
main endp
END main
`
  }
];

